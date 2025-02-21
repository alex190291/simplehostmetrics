import yaml
import re
import subprocess
import os
import logging
from datetime import datetime
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Entfernt: Datenbankabhängigkeit (get_db_connection) wird nicht mehr benötigt

# Thread-sichere Caches für In-Memory Logging (Lösung 1, Option 4)
login_attempts_cache = []
http_error_logs_cache = []
login_attempts_lock = threading.Lock()
http_error_logs_lock = threading.Lock()

# Logging-Konfiguration
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

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
        return [os.path.join(path, filename) for filename in os.listdir(path)
                if os.path.isfile(os.path.join(path, filename))]
    else:
        return []

class LogParser:
    def __init__(self):
        self.proxy_logs = config.get('logfiles', [])
        logging.debug("LogParser initialisiert mit proxy logs: %s", self.proxy_logs)
        self.setup_watchdog()

    def parse_log_files(self):
        logging.debug("Starte parse_log_files")
        for log_config in self.proxy_logs:
            path = log_config.get('path')
            proxy_type = log_config.get('proxy_type')
            logging.debug("Verarbeite proxy log: %s (Typ: %s)", path, proxy_type)
            self.parse_proxy_log(path, proxy_type)
        self.parse_system_logs()

    def parse_proxy_log(self, log_path, proxy_type):
        if not os.path.exists(log_path):
            logging.warning("Proxy log-Pfad existiert nicht: %s", log_path)
            return
        log_files = get_log_files(log_path)
        for file in log_files:
            logging.debug("Verarbeite proxy log-Datei: %s", file)
            with open(file, 'r') as log_file:
                for line in log_file:
                    line = line.strip()
                    if not line:
                        continue
                    logging.debug("Verarbeite Zeile im proxy log: %s", line)
                    self.process_http_error_log(line, proxy_type)

    def parse_system_logs(self):
        logging.debug("Verarbeite System-Logs für Login-Versuche")
        system_log_paths = ["/var/log/secure", "/var/log/auth.log", "/var/log/fail2ban.log", "/var/log/firewalld"]
        for log_path in system_log_paths:
            if os.path.exists(log_path):
                logging.debug("Verarbeite System-Log: %s", log_path)
                self.parse_login_attempts(log_path)
            else:
                logging.warning("System-Log-Pfad existiert nicht: %s", log_path)
        self.parse_lastb_output()

    def process_http_error_log(self, line, proxy_type):
        if proxy_type == "zoraxy":
            pattern = r"\[[^\]]+\]\s+\[[^\]]+\]\s+\[origin:(?P<origin>[^\]]*)\]\s+\[client\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\]\s+(?P<method>[A-Z]+)\s+(?P<url>\S+)\s+(?P<code>\d{3})"
        elif proxy_type == "npm":
            pattern = r'^\[(?P<timestamp>[^\]]+)\]\s+(?P<code>\d{3})\s+-\s+(?P<method>[A-Z]+|-)\s+(?P<protocol>\S+)\s+(?P<host>\S+)\s+"(?P<url>[^"]+)"\s+\[Client\s+(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\]'
        else:
            logging.debug("Unbekannter proxy_type '%s'. Verwende npm Regex als Standard.", proxy_type)
            pattern = r'^\[(?P<timestamp>[^\]]+)\]\s+(?P<code>\d{3})\s+-\s+(?P<method>[A-Z]+|-)\s+(?P<protocol>\S+)\s+(?P<host>\S+)\s+"(?P<url>[^"]+)"\s+\[Client\s+(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\]'
        match = re.search(pattern, line)
        if match:
            ip_address = match.group("ip")
            url = match.group("url")
            error_code = int(match.group("code"))
            if error_code >= 400:
                logging.debug("HTTP error log erkannt: IP %s, URL %s, Code %s, Proxy %s",
                              ip_address, url, error_code, proxy_type)
                self.store_http_error_log(proxy_type, error_code, url, ip_address)
            else:
                logging.debug("Zeile entspricht keinem Fehler (Code < 400): %s", line)
            return
        logging.debug("Keine Übereinstimmung im HTTP error log für Zeile: %s", line)

    def process_login_attempt(self, line):
        pattern_failed = r"Failed password for (?:invalid user )?(?P<user>\S+) from (?P<ip>\S+) port \d+"
        match = re.search(pattern_failed, line)
        if match:
            user = match.group("user")
            ip_address = match.group("ip")
            logging.debug("Login-Versuch (failed password) erkannt: Benutzer %s, IP %s", user, ip_address)
            self.store_failed_login(user, ip_address)
            return
        pattern_invalid = r"Invalid user (?P<user>\S+) from (?P<ip>\S+) port \d+"
        match = re.search(pattern_invalid, line)
        if match:
            user = match.group("user")
            ip_address = match.group("ip")
            logging.debug("Login-Versuch (invalid user) erkannt: Benutzer %s, IP %s", user, ip_address)
            self.store_failed_login(user, ip_address)
            return
        logging.debug("Keine Übereinstimmung für Login-Versuch in Zeile: %s", line)

    def parse_login_attempts(self, log_path):
        if not os.path.exists(log_path):
            logging.warning("Login-Versuch Log-Pfad existiert nicht: %s", log_path)
            return
        log_files = get_log_files(log_path)
        for file in log_files:
            logging.debug("Verarbeite Login-Versuch Log-Datei: %s", file)
            with open(file, 'r') as log_file:
                for line in log_file:
                    line = line.strip()
                    if not line:
                        continue
                    logging.debug("Verarbeite Zeile im System-Log für Login-Versuch: %s", line)
                    self.process_login_attempt(line)

    def parse_lastb_output(self):
        logging.debug("Verarbeite Ausgabe von lastb")
        try:
            result = subprocess.run(['lastb'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode != 0:
                logging.error("Fehler beim Ausführen von lastb: %s", result.stderr.decode())
                return
            output = result.stdout.decode()
            for line in output.splitlines():
                line = line.strip()
                if not line:
                    continue
                logging.debug("Verarbeite Zeile aus lastb: %s", line)
                self.process_login_attempt(line)
        except Exception as e:
            logging.error("Ausnahmefehler bei lastb: %s", e)

    def store_failed_login(self, user, ip_address):
        timestamp = datetime.now().timestamp()
        failure_reason = "Failed login attempt"
        with login_attempts_lock:
            login_attempts_cache.append({
                "id": len(login_attempts_cache) + 1,
                "user": user,
                "ip_address": ip_address,
                "timestamp": timestamp,
                "failure_reason": failure_reason
            })
        logging.debug("Gespeicherter fehlgeschlagener Login-Versuch für Benutzer %s von IP %s", user, ip_address)

    def store_http_error_log(self, proxy_type, error_code, url, ip_address):
        timestamp = datetime.now().timestamp()
        with http_error_logs_lock:
            http_error_logs_cache.append({
                "id": len(http_error_logs_cache) + 1,
                "proxy_type": proxy_type,
                "error_code": error_code,
                "timestamp": timestamp,
                "url": url
            })
        logging.debug("Gespeicherter HTTP error log: Proxy %s, Code %s, URL %s", proxy_type, error_code, url)

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
        self.parse_log_files()

def fetch_login_attempts():
    with login_attempts_lock:
        return list(login_attempts_cache)

def fetch_http_error_logs():
    with http_error_logs_lock:
        return list(http_error_logs_cache)
