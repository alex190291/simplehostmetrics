# rtad_manager.py
import yaml
import re
import subprocess
import os
import logging
import threading
import time
import requests
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from threading import Timer
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# ----------------------------
# Prekompilierte Regex-Pattern
# ----------------------------
REGEX_ZORAXY = re.compile(
    r"\[[^\]]+\]\s+\[[^\]]+\]\s+\[origin:(?P<origin>[^\]]*)\]\s+\[client\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\]\s+(?P<method>[A-Z]+)\s+(?P<url>\S+)\s+(?P<code>\d{3})"
)
REGEX_NPM = re.compile(
    r'^\[(?P<timestamp>[^\]]+)\]\s+(?P<code>\d{3})\s+-\s+(?P<method>[A-Z]+|-)\s+(?P<protocol>\S+)\s+(?P<host>\S+)\s+"(?P<url>[^"]+)"\s+\[Client\s+(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\]'
)

# Prekompilierte Regex für Login-Versuche
RE_LOGIN_FAILED = re.compile(
    r"Failed password for (?:invalid user )?(?P<user>\S+) from (?P<ip>\S+)(?:\s+\((?P<host>[^\)]+)\))? port \d+"
)
RE_LOGIN_INVALID = re.compile(
    r"Invalid user (?P<user>\S+) from (?P<ip>\S+)(?:\s+\((?P<host>[^\)]+)\))? port \d+"
)

# ----------------------------
# Globale Variablen für File-Offset Tracking und Caches
# ----------------------------
file_offsets = {}
file_offsets_lock = threading.Lock()

# Caches für In-Memory Logging (max. 500 Einträge)
login_attempts_cache = []
http_error_logs_cache = []
login_attempts_lock = threading.Lock()
http_error_logs_lock = threading.Lock()

# Globaler Cache für IP-Länderinformationen mit TTL-Unterstützung
# Struktur: { normalized_ip: {"country": str, "timestamp": float} }
ip_country_cache = {}
ip_country_cache_lock = threading.Lock()

# Konfiguration aus config.yml laden
with open('config.yml', 'r') as f:
    config = yaml.safe_load(f)

def get_log_files(path):
    """
    Gibt eine Liste von Log-Dateien zurück.
    Falls 'path' eine Datei ist, wird diese in eine Liste gepackt.
    Falls 'path' ein Verzeichnis ist, werden alle darin enthaltenen Dateien zurückgegeben.
    """
    if os.path.isfile(path):
        return [path]
    elif os.path.isdir(path):
        return [
            os.path.join(path, filename)
            for filename in os.listdir(path)
            if os.path.isfile(os.path.join(path, filename))
        ]
    else:
        return []

def get_country(ip):
    """
    Ruft die Länderinformation für die gegebene IP-Adresse mit einem Retry-Mechanismus ab.
    """
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    try:
        response = session.get(f"http://ip-api.com/json/{ip}?fields=country", timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get("country", "Unknown")
        else:
            return "Unknown"
    except Exception as e:
        logging.error("Error retrieving country for IP %s: %s", ip, e)
        return "Unknown"

def get_country_cached(ip, ttl=3600):
    """
    Gibt die Länderinformation für eine IP-Adresse zurück, wobei ein TTL-basierter Cache genutzt wird.
    Wenn der Wert "Unknown" ist, wird ein kürzerer TTL (60 Sekunden) verwendet.
    """
    ip = ip.strip()  # Normalisierung der IP-Adresse
    unknown_ttl = 60
    with ip_country_cache_lock:
        if ip in ip_country_cache:
            entry = ip_country_cache[ip]
            if entry["country"] != "Unknown":
                if (time.time() - entry["timestamp"]) < ttl:
                    return entry["country"]
            else:
                if (time.time() - entry["timestamp"]) < unknown_ttl:
                    return entry["country"]
    country = get_country(ip)
    with ip_country_cache_lock:
        ip_country_cache[ip] = {"country": country, "timestamp": time.time()}
    return country

class LogParser:
    def __init__(self):
        self.proxy_logs = config.get('logfiles', [])
        logging.debug("LogParser initialisiert mit proxy logs: %s", self.proxy_logs)
        self.debounce_timer = None
        self.debounce_lock = threading.Lock()
        self.setup_watchdog()

    def process_log_file(self, file_path, line_processor):
        try:
            with file_offsets_lock:
                last_offset = file_offsets.get(file_path, 0)
            with open(file_path, 'r') as f:
                f.seek(last_offset)
                new_data = f.read()
                new_offset = f.tell()
            with file_offsets_lock:
                file_offsets[file_path] = new_offset
            if new_data:
                for line in new_data.splitlines():
                    line = line.strip()
                    if line:
                        line_processor(line)
        except Exception as e:
            logging.error("Fehler beim Verarbeiten der Datei %s: %s", file_path, e)

    def process_files_concurrently(self, files, line_processor):
        with ThreadPoolExecutor() as executor:
            futures = [executor.submit(self.process_log_file, file, line_processor) for file in files]
            for future in futures:
                future.result()

    def parse_log_files(self):
        logging.debug("Starte parse_log_files")
        for log_config in self.proxy_logs:
            path = log_config.get('path')
            proxy_type = log_config.get('proxy_type')
            if not os.path.exists(path):
                logging.warning("Proxy log-Pfad existiert nicht: %s", path)
                continue
            files = get_log_files(path)
            self.process_files_concurrently(files, lambda line: self.process_http_error_log(line, proxy_type))
        system_log_paths = ["/var/log/secure", "/var/log/auth.log", "/var/log/fail2ban.log", "/var/log/firewalld"]
        for log_path in system_log_paths:
            if os.path.exists(log_path):
                files = get_log_files(log_path)
                self.process_files_concurrently(files, self.process_login_attempt)
            else:
                logging.warning("System-Log-Pfad existiert nicht: %s", log_path)
        self.parse_btmp_file()

    def process_http_error_log(self, line, proxy_type):
        if proxy_type == "zoraxy":
            match = REGEX_ZORAXY.search(line)
            if match:
                ip_address = match.group("ip")
                url = match.group("url")
                error_code = int(match.group("code"))
                domain = match.group("origin")
            else:
                logging.debug("Keine Übereinstimmung im zoraxy HTTP error log für Zeile: %s", line)
                return
        else:
            match = REGEX_NPM.search(line)
            if match:
                ip_address = match.group("ip")
                url = match.group("url")
                error_code = int(match.group("code"))
                domain = match.group("host") if "host" in match.groupdict() else None
            else:
                logging.debug("Keine Übereinstimmung im npm HTTP error log für Zeile: %s", line)
                return
        parse_all = config.get('parse_all_logs', False)
        if parse_all or error_code >= 400:
            logging.debug("HTTP error log erkannt: IP %s, Domain %s, URL %s, Code %s, Proxy %s",
                          ip_address, domain, url, error_code, proxy_type)
            self.store_http_error_log(proxy_type, error_code, url, ip_address, domain)
        else:
            logging.debug("Zeile entspricht keinem relevanten Status (Code < 400) und parse_all_logs ist false: %s", line)

    def process_login_attempt(self, line):
        match = RE_LOGIN_FAILED.search(line)
        if not match:
            match = RE_LOGIN_INVALID.search(line)
        if match:
            user = match.group("user")
            ip_address = match.group("ip")
            host = match.group("host") if "host" in match.groupdict() else None
            logging.debug("Login-Versuch erkannt: Benutzer %s, IP %s, Host %s", user, ip_address, host)
            self.store_failed_login(user, ip_address, host)
        else:
            logging.debug("Keine Übereinstimmung für Login-Versuch in Zeile: %s", line)

    def parse_btmp_file(self):
        logging.debug("Parsing /var/log/btmp using utmp.read")
        try:
            import utmp
        except ImportError:
            logging.error("python‑utmp library is not installiert. Bitte installieren Sie diese Bibliothek, um /var/log/btmp direkt zu parsen.")
            return

        btmp_path = "/var/log/btmp"
        if not os.path.exists(btmp_path):
            logging.warning("Datei /var/log/btmp existiert nicht.")
            return

        try:
            with open(btmp_path, "rb") as fd:
                buf = fd.read()
            for record in utmp.read(buf):
                user = getattr(record, "user", None)
                host = getattr(record, "host", None)
                ip_address = host  # Falls keine separate IP vorhanden
                logging.debug("Btmp-Eintrag: Time: %s, Type: %s, User: %s, Host/IP: %s",
                              record.time, record.type, user, host)
                self.store_failed_login(user, ip_address, host, timestamp=record.time)
        except Exception as e:
            logging.error("Fehler beim Parsen von /var/log/btmp: %s", e)

    def store_failed_login(self, user, ip_address, host, timestamp=None):
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        with login_attempts_lock:
            login_attempts_cache.append({
                "user": user,
                "ip_address": ip_address,
                "timestamp": timestamp,
                "failure_reason": "Failed login attempt"
            })
            if len(login_attempts_cache) > 500:
                login_attempts_cache.pop(0)
        logging.debug("Gespeicherter fehlgeschlagener Login-Versuch: Benutzer %s, IP %s, Host %s, Timestamp: %s",
                      user, ip_address, host, timestamp)

    def store_http_error_log(self, proxy_type, error_code, url, ip_address, domain, timestamp=None):
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        with http_error_logs_lock:
            http_error_logs_cache.append({
                "proxy_type": proxy_type,
                "error_code": error_code,
                "timestamp": timestamp,
                "url": url,
                "ip_address": ip_address,
                "domain": domain
            })
            if len(http_error_logs_cache) > 500:
                http_error_logs_cache.pop(0)
        logging.debug("Gespeicherter HTTP error log: Proxy %s, Code %s, URL %s, IP %s, Domain %s, Timestamp: %s",
                      proxy_type, error_code, url, ip_address, domain, timestamp)

    def setup_watchdog(self):
        logging.debug("Einrichten des Watchdog Observers")
        event_handler = FileSystemEventHandler()
        event_handler.on_modified = self.on_modified
        observer = Observer()
        for log_config in self.proxy_logs:
            path = log_config.get('path')
            if os.path.exists(path):
                directory = path if os.path.isdir(path) else os.path.dirname(path)
                logging.debug("Watchdog wird für Verzeichnis geplant: %s", directory)
                observer.schedule(event_handler, directory, recursive=False)
            else:
                logging.warning("Watchdog konnte Pfad nicht planen (existiert nicht): %s", path)
        observer.start()

    def on_modified(self, event):
        if event.is_directory:
            return
        logging.debug("Watchdog: Änderung in Datei erkannt: %s", event.src_path)
        with self.debounce_lock:
            if self.debounce_timer is not None:
                self.debounce_timer.cancel()
            self.debounce_timer = Timer(1.0, self.parse_log_files)
            self.debounce_timer.start()

def fetch_login_attempts():
    with login_attempts_lock:
        return list(login_attempts_cache)

def fetch_http_error_logs():
    with http_error_logs_lock:
        return list(http_error_logs_cache)

def update_missing_country_info():
    # Update login_attempts_cache Einträge
    with login_attempts_lock:
        for attempt in login_attempts_cache:
            # Wenn noch kein Ländereintrag vorhanden ist oder "Unknown" vorliegt, dann updaten
            if "country" not in attempt or attempt.get("country") == "Unknown":
                ip = attempt["ip_address"].strip()
                attempt["country"] = get_country_cached(ip)
    # Update http_error_logs_cache Einträge
    with http_error_logs_lock:
        for log in http_error_logs_cache:
            if "country" not in log or log.get("country") == "Unknown":
                ip = log["ip_address"].strip()
                log["country"] = get_country_cached(ip)

def update_country_info_job():
    while True:
        update_missing_country_info()
        time.sleep(10)
