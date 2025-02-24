# rtad_manager.py
import yaml
import os
import logging
import threading
import time
import requests
import geoip2.database
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from threading import Timer

# Precompiled regex for proxy events
REGEX_ZORAXY = re.compile(
    r"\[[^\]]+\]\s+\[[^\]]+\]\s+\[origin:(?P<origin>[^\]]*)\]\s+\[client\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\]\s+(?P<method>[A-Z]+)\s+(?P<url>\S+)\s+(?P<code>\d{3})"
)
REGEX_NPM = re.compile(
    r'^\[(?P<timestamp>[^\]]+)\]\s+(?P<code>\d{3})\s+-\s+(?P<method>[A-Z]+|-)\s+(?P<protocol>\S+)\s+(?P<host>\S+)\s+"(?P<url>[^"]+)"\s+\[Client\s+(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\]'
)

# Global caches and locks for login attempts and HTTP error logs
login_attempts_cache = []
http_error_logs_cache = []
login_attempts_lock = threading.Lock()
http_error_logs_lock = threading.Lock()

# Global cache for IP geo-information with TTL
ip_country_cache = {}
ip_country_cache_lock = threading.Lock()

# Path to the local GeoLite2-City database
GEOIP_DB_PATH = '/usr/share/GeoIP/GeoLite2-City.mmdb'

# Load configuration from config.yml
with open('config.yml', 'r') as f:
    config = yaml.safe_load(f)

def normalize_timestamp(ts=None):
    if ts is None:
        ts = time.time()
    if isinstance(ts, datetime):
        return ts.isoformat()
    elif isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts).isoformat()
    else:
        raise TypeError(f"Invalid type for timestamp: {type(ts)}")

def get_formatted_timestamp(ts=None):
    return normalize_timestamp(ts)

def get_log_files(path):
    if os.path.isfile(path):
        return [path]
    elif os.path.isdir(path):
        return [os.path.join(path, filename) for filename in os.listdir(path)
                if os.path.isfile(os.path.join(path, filename))]
    else:
        return []

##############################
# GeoLite2 Database Helpers
##############################
def download_geolite2_country_db(db_path):
    url = "https://git.io/GeoLite2-City.mmdb"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        with open(db_path, "wb") as f:
            f.write(response.content)
        logging.info("GeoLite2-City database downloaded to %s", db_path)
    except Exception as e:
        logging.error("Error downloading GeoLite2-City database: %s", e)

def ensure_geolite2_db(db_path, max_age_seconds=86400):
    if os.path.exists(db_path):
        age = time.time() - os.path.getmtime(db_path)
        if age < max_age_seconds:
            logging.info("GeoLite2 database is current (age: %s seconds).", age)
            return
        else:
            logging.info("GeoLite2 database is older than %s seconds (age: %s); downloading new version.", max_age_seconds, age)
    else:
        logging.info("GeoLite2 database not found; downloading.")
    download_geolite2_country_db(db_path)

def get_geo_info_from_db(ip):
    ip = ip.strip()
    ensure_geolite2_db(GEOIP_DB_PATH)
    try:
        with geoip2.database.Reader(GEOIP_DB_PATH) as reader:
            response = reader.city(ip)
            country = response.country.iso_code if response and response.country.iso_code else "Unknown"
            city = response.city.name if response and response.city.name else "Unknown"
            latitude = response.location.latitude if response and response.location.latitude else None
            longitude = response.location.longitude if response and response.location.longitude else None
            return {"country": country, "city": city, "lat": latitude, "lon": longitude}
    except Exception as e:
        logging.error("Error during GeoIP lookup for IP %s: %s", ip, e)
        return {"country": "Unknown", "city": "Unknown", "lat": None, "lon": None}

def get_geo_info_cached(ip, ttl=3600):
    ip = ip.strip()
    unknown_ttl = 60
    with ip_country_cache_lock:
        if ip in ip_country_cache:
            entry = ip_country_cache[ip]
            if entry["country"] != "Unknown" and entry["city"] != "Unknown":
                if (time.time() - entry["timestamp"]) < ttl:
                    return {"country": entry["country"], "city": entry["city"], "lat": entry.get("lat"), "lon": entry.get("lon")}
            else:
                if (time.time() - entry["timestamp"]) < unknown_ttl:
                    return {"country": entry["country"], "city": entry["city"], "lat": entry.get("lat"), "lon": entry.get("lon")}
    info = get_geo_info_from_db(ip)
    with ip_country_cache_lock:
        ip_country_cache[ip] = {
            "country": info["country"],
            "city": info["city"],
            "lat": info["lat"],
            "lon": info["lon"],
            "timestamp": time.time()
        }
    return info

##################################
# Country-Centroid Fallback Logic
##################################
COUNTRY_CENTROIDS = {
    "US": (37.0902, -95.7129),
    "CN": (35.8617, 104.1954),
    "HK": (22.3193, 114.1694),
    "TR": (38.9637, 35.2433),
    "RO": (45.9432, 24.9668),
    "NL": (52.1326, 5.2913),
    "RU": (61.5240, 105.3188),
    "SG": (1.3521, 103.8198),
    "DE": (51.1657, 10.4515),
    "CH": (46.8182, 8.2275),
    "UA": (48.3794, 31.1656),
    # Add more as needed...
}

def get_country_centroid(country_code):
    """Return the approximate centroid of the given country_code or (0,0) if unknown."""
    if not country_code or country_code == "Unknown":
        return (0, 0)
    return COUNTRY_CENTROIDS.get(country_code.upper(), (0, 0))

##################################
# Log Parsing Classes & Methods
##################################
class LogParser:
    def __init__(self):
        self.proxy_logs = config.get('logfiles', [])
        logging.debug("LogParser initialized with proxy logs: %s", self.proxy_logs)
        self.debounce_timer = None
        self.debounce_lock = threading.Lock()
        self.setup_watchdog()

    def process_log_file(self, file_path, line_processor):
        try:
            with open(file_path, 'r') as f:
                new_data = f.read()
            if new_data:
                for line in new_data.splitlines():
                    line = line.strip()
                    if line:
                        line_processor(line)
        except Exception as e:
            logging.error("Error processing file %s: %s", file_path, e)

    def process_files_concurrently(self, files, line_processor):
        with ThreadPoolExecutor() as executor:
            futures = [executor.submit(self.process_log_file, file, line_processor) for file in files]
            for future in futures:
                future.result()

    def parse_log_files(self):
        logging.debug("Starting parse_log_files")
        # Process proxy logs for HTTP error events
        for log_config in self.proxy_logs:
            path = log_config.get('path')
            proxy_type = log_config.get('proxy_type')
            if not os.path.exists(path):
                logging.warning("Proxy log path does not exist: %s", path)
                continue
            files = get_log_files(path)
            self.process_files_concurrently(files, lambda line: self.process_http_error_log(line, proxy_type))
        # Use only the btmp file for failed login attempts
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
                logging.debug("No match in zoraxy HTTP error log for line: %s", line)
                return
        else:
            match = REGEX_NPM.search(line)
            if match:
                ip_address = match.group("ip")
                url = match.group("url")
                error_code = int(match.group("code"))
                domain = match.group("host") if "host" in match.groupdict() else None
            else:
                logging.debug("No match in npm HTTP error log for line: %s", line)
                return

        parse_all = config.get('parse_all_logs', False)
        if parse_all or error_code >= 400:
            logging.debug("HTTP error log detected: IP %s, Domain %s, URL %s, Code %s, Proxy %s",
                          ip_address, domain, url, error_code, proxy_type)
            self.store_http_error_log(proxy_type, error_code, url, ip_address, domain)
        else:
            logging.debug("Line does not meet criteria (code < 400 and parse_all_logs is false): %s", line)

    def parse_btmp_file(self):
        logging.debug("Parsing /var/log/btmp using utmp.read")
        try:
            import utmp
        except ImportError:
            logging.error("python‑utmp library not installed. Please install it to parse /var/log/btmp directly.")
            return

        btmp_path = "/var/log/btmp"
        if not os.path.exists(btmp_path):
            logging.warning("/var/log/btmp does not exist.")
            return

        try:
            with open(btmp_path, "rb") as fd:
                buf = fd.read()
            for record in utmp.read(buf):
                user = getattr(record, "user", None)
                host = getattr(record, "host", None)
                ip_address = host  # Use host as IP if no separate IP is available
                logging.debug("Btmp entry: Time: %s, Type: %s, User: %s, Host/IP: %s",
                              record.time, record.type, user, host)
                self.store_failed_login(user, ip_address, host, timestamp=record.time)
        except Exception as e:
            logging.error("Error parsing /var/log/btmp: %s", e)

    def store_failed_login(self, user, ip_address, host, timestamp=None):
        timestamp = normalize_timestamp(timestamp)
        with login_attempts_lock:
            login_attempts_cache.append({
                "user": user,
                "ip_address": ip_address,
                "timestamp": timestamp,
                "failure_reason": "Failed login attempt",
                "country": "Unknown",
                "city": "Unknown",
                "lat": None,
                "lon": None
            })
            if len(login_attempts_cache) > 500:
                login_attempts_cache.pop(0)
        logging.debug("Stored failed login attempt: User %s, IP %s, Host %s, Timestamp: %s",
                      user, ip_address, host, timestamp)

    def store_http_error_log(self, proxy_type, error_code, url, ip_address, domain, timestamp=None):
        timestamp = normalize_timestamp(timestamp)
        with http_error_logs_lock:
            http_error_logs_cache.append({
                "proxy_type": proxy_type,
                "error_code": error_code,
                "timestamp": timestamp,
                "url": url,
                "ip_address": ip_address,
                "domain": domain,
                "country": "Unknown",
                "city": "Unknown",
                "lat": None,
                "lon": None
            })
            if len(http_error_logs_cache) > 500:
                http_error_logs_cache.pop(0)
        logging.debug("Stored HTTP error log: Proxy %s, Code %s, URL %s, IP %s, Domain %s, Timestamp: %s",
                      proxy_type, error_code, url, ip_address, domain, timestamp)

    def setup_watchdog(self):
        logging.debug("Setting up Watchdog Observer")
        event_handler = FileSystemEventHandler()
        event_handler.on_modified = self.on_modified
        observer = Observer()
        for log_config in self.proxy_logs:
            path = log_config.get('path')
            if os.path.exists(path):
                directory = path if os.path.isdir(path) else os.path.dirname(path)
                logging.debug("Scheduling Watchdog for directory: %s", directory)
                observer.schedule(event_handler, directory, recursive=False)
            else:
                logging.warning("Watchdog could not schedule non-existent path: %s", path)
        observer.start()

    def on_modified(self, event):
        if event.is_directory:
            return
        logging.debug("Watchdog: Detected change in file: %s", event.src_path)
        with self.debounce_lock:
            if self.debounce_timer is not None:
                self.debounce_timer.cancel()
            self.debounce_timer = Timer(1.0, self.parse_log_files)
            self.debounce_timer.start()

#######################
# Public Fetch Methods
#######################
def fetch_login_attempts():
    with login_attempts_lock:
        return list(login_attempts_cache)

def fetch_http_error_logs():
    with http_error_logs_lock:
        return list(http_error_logs_cache)

########################
# Country Info Updater
########################
def update_missing_country_info():
    """
    For each login attempt or HTTP error log,
    get city-level lat/lon from the GeoIP DB.
    If it's missing, fallback to the country centroid.
    If that fails, keep lat/lon as (0,0).
    """
    with login_attempts_lock:
        for attempt in login_attempts_cache:
            ip = attempt["ip_address"].strip()
            info = get_geo_info_cached(ip)
            if info["lat"] is None or info["lon"] is None:
                # Fallback to country centroid
                lat, lon = get_country_centroid(info["country"])
                info["lat"] = lat
                info["lon"] = lon
            attempt["country"] = info["country"]
            attempt["city"] = info["city"]
            attempt["lat"] = info["lat"]
            attempt["lon"] = info["lon"]

    with http_error_logs_lock:
        for log in http_error_logs_cache:
            ip = log["ip_address"].strip()
            info = get_geo_info_cached(ip)
            if info["lat"] is None or info["lon"] is None:
                # Fallback to country centroid
                lat, lon = get_country_centroid(info["country"])
                info["lat"] = lat
                info["lon"] = lon
            log["country"] = info["country"]
            log["city"] = info["city"]
            log["lat"] = info["lat"]
            log["lon"] = info["lon"]

def update_country_info_job():
    while True:
        update_missing_country_info()
        time.sleep(10)
