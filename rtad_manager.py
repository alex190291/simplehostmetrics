# rtad_manager.py
import yaml
import os
import logging
import threading
import time
import requests
import geoip2.database
import re
import pytz
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from threading import Timer
from collections import deque

# Global counters for diff-based updates
login_attempt_counter = 0
http_error_log_counter = 0

# Precompiled regex for proxy events
REGEX_ZORAXY = re.compile(
    r"\[[^\]]+\]\s+\[[^\]]+\]\s+\[origin:(?P<origin>[^\]]*)\]\s+\[client\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\]\s+(?P<method>[A-Z]+)\s+(?P<url>\S+)\s+(?P<code>\d{3})"
)
REGEX_NPM = re.compile(
    r'^\[(?P<timestamp>[^\]]+)\]\s+(?P<code>\d{3})\s+-\s+(?P<method>[A-Z]+|-)\s+(?P<protocol>\S+)\s+(?P<host>\S+)\s+"(?P<url>[^"]+)"\s+\[Client\s+(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\]'
)

# Instead of normal lists, use deques for stable FIFO with a maxlen
# => 1000 login + 1000 proxy
login_attempts_cache = deque(maxlen=1000)
http_error_logs_cache = deque(maxlen=1000)

# Locks to protect concurrent writes
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

####################################
# Timezone Parsing and Configuration
####################################
def parse_timezone(tz_str):
    tz_str_lower = tz_str.strip().lower()
    if tz_str_lower.startswith("gmt"):
        try:
            # e.g. "gmt+2" or "gmt-3"
            offset_str = tz_str_lower[3:]
            offset_hours = int(offset_str)
            return pytz.FixedOffset(offset_hours * 60)
        except Exception as e:
            logging.error("Invalid GMT timezone format: %s", tz_str)
            return pytz.utc
    else:
        # Map common abbreviations to proper tz database names for DST corrections.
        TZ_ABBREVIATION_MAP = {
            "cet": "Europe/Paris",
            "cest": "Europe/Paris",
            "mest": "Europe/Paris",
            "utc": "UTC",
        }
        if tz_str_lower in TZ_ABBREVIATION_MAP:
            tz_name = TZ_ABBREVIATION_MAP[tz_str_lower]
        else:
            tz_name = tz_str.upper()
        try:
            return pytz.timezone(tz_name)
        except Exception as e:
            logging.error("Invalid timezone: %s", tz_str)
            return pytz.utc

TIMEZONE_CONFIG = config.get("timezone", "UTC")
TIMEZONE = parse_timezone(TIMEZONE_CONFIG)

####################################
# Timestamp Normalization with Timezone
####################################
def normalize_timestamp(ts=None):
    if ts is None:
        ts = time.time()
    if isinstance(ts, datetime):
        dt = ts
        if dt.tzinfo is None:
            dt = TIMEZONE.localize(dt)
        else:
            dt = dt.astimezone(TIMEZONE)
    elif isinstance(ts, (int, float)):
        dt = datetime.fromtimestamp(ts, TIMEZONE)
    else:
        raise TypeError(f"Invalid type for timestamp: {type(ts)}")
    return dt.isoformat()

def get_formatted_timestamp(ts=None):
    return normalize_timestamp(ts)

def get_log_files(path):
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
            logging.info(
                "GeoLite2 database is older than %s seconds (age: %s); downloading new version.",
                max_age_seconds,
                age,
            )
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
                    return {
                        "country": entry["country"],
                        "city": entry["city"],
                        "lat": entry.get("lat"),
                        "lon": entry.get("lon"),
                    }
            else:
                if (time.time() - entry["timestamp"]) < unknown_ttl:
                    return {
                        "country": entry["country"],
                        "city": entry["city"],
                        "lat": entry.get("lat"),
                        "lon": entry.get("lon"),
                    }
    info = get_geo_info_from_db(ip)
    with ip_country_cache_lock:
        ip_country_cache[ip] = {
            "country": info["country"],
            "city": info["city"],
            "lat": info["lat"],
            "lon": info["lon"],
            "timestamp": time.time(),
        }
    return info

##################################
# Country-Centroid Fallback Logic
##################################
def load_country_centroids(filepath="country_centroids.yml"):
    try:
        with open(filepath, 'r') as f:
            centroids = yaml.safe_load(f)
            result = {}
            for k, v in centroids.items():
                # Convert the key to string
                key_str = str(k).upper()
                # Expect the value to be a list or tuple of coordinates (e.g., [lat, lon])
                if isinstance(v, (list, tuple)) and len(v) == 2:
                    result[key_str] = tuple(v)
                else:
                    logging.error("Invalid centroid value for key %s: expected list/tuple of length 2, got %s", key_str, v)
            return result
    except Exception as e:
        logging.error("Error loading country centroids from %s: %s", filepath, e)
        return {}

COUNTRY_CENTROIDS = load_country_centroids()

def get_country_centroid(country_code):
    """Return the approximate centroid of the given country_code or (0,0) if unknown."""
    if not country_code or country_code == "Unknown":
        return (0, 0)
    return COUNTRY_CENTROIDS.get(country_code.upper(), (0, 0))

##################################
# File Offset Tracking
##################################
class FileOffsetTracker:
    """
    Tracks file offsets so we only parse new lines. If file is rotated/truncated,
    we reset offset to 0.
    """
    def __init__(self):
        # Map of file_path -> (inode, offset)
        self.file_offsets = {}
        self.lock = threading.Lock()

    def get_offset(self, path):
        with self.lock:
            return self.file_offsets.get(path, (None, 0))

    def update_offset(self, path, inode, offset):
        with self.lock:
            self.file_offsets[path] = (inode, offset)

    def reset_offset(self, path):
        with self.lock:
            if path in self.file_offsets:
                del self.file_offsets[path]

offset_tracker = FileOffsetTracker()

def read_new_lines_from_file(file_path):
    """
    Reads only new lines from the file since the last offset. If the file was
    rotated/truncated, reset offset to 0.
    """
    if not os.path.isfile(file_path):
        return []

    inode = os.stat(file_path).st_ino
    old_inode, old_offset = offset_tracker.get_offset(file_path)

    # If inode changed or file size < old_offset => log rotation or truncation
    size = os.path.getsize(file_path)
    if inode != old_inode or size < old_offset:
        old_offset = 0

    new_lines = []
    with open(file_path, 'r') as f:
        f.seek(old_offset)
        while True:
            line = f.readline()
            if not line:
                break
            new_lines.append(line.rstrip('\n'))

        new_offset = f.tell()
    offset_tracker.update_offset(file_path, inode, new_offset)
    return new_lines

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
        # Only read new lines since last offset
        new_lines = read_new_lines_from_file(file_path)
        if new_lines:
            for line in new_lines:
                line = line.strip()
                if line:
                    line_processor(line)

    def process_files_concurrently(self, files, line_processor):
        with ThreadPoolExecutor() as executor:
            futures = [
                executor.submit(self.process_log_file, file, line_processor)
                for file in files
            ]
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
        """
        Parse /var/log/btmp for failed login attempts. We do a partial read as well.
        If the file is rotated or truncated, we reset offset.
        """
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

        # We'll treat each new read as new records. If the file is rotated, we reset offset.
        # So let's do a small custom approach to partial read:
        inode = os.stat(btmp_path).st_ino
        old_inode, old_offset = offset_tracker.get_offset(btmp_path)
        size = os.path.getsize(btmp_path)
        if inode != old_inode or size < old_offset:
            old_offset = 0

        # We'll read the entire file from old_offset in binary, parse new utmp records only
        new_records = []
        with open(btmp_path, "rb") as fd:
            fd.seek(old_offset)
            buf = fd.read()
            new_offset = fd.tell()

        offset_tracker.update_offset(btmp_path, inode, new_offset)

        # Parse the newly read bytes as utmp records
        try:
            for record in utmp.read(buf):
                new_records.append(record)
        except Exception as e:
            logging.error("Error parsing newly read bytes from /var/log/btmp: %s", e)
            return

        for record in new_records:
            user = getattr(record, "user", None)
            host = getattr(record, "host", None)
            ip_address = host  # Use host as IP if no separate IP is available
            logging.debug("Btmp entry: Time: %s, Type: %s, User: %s, Host/IP: %s",
                          record.time, record.type, user, host)
            self.store_failed_login(user, ip_address, host, timestamp=record.time)

    def store_failed_login(self, user, ip_address, host, timestamp=None):
        global login_attempt_counter
        ts = normalize_timestamp(timestamp)
        with login_attempts_lock:
            login_attempt_counter += 1
            login_attempts_cache.append({
                "id": login_attempt_counter,
                "user": user,
                "ip_address": ip_address,
                "timestamp": ts,
                "failure_reason": "Failed login attempt",
                "country": "Unknown",
                "city": "Unknown",
                "lat": None,
                "lon": None
            })
        logging.debug("Stored failed login attempt (ID %s): User %s, IP %s, Host %s, Timestamp: %s",
                    login_attempt_counter, user, ip_address, host, ts)

    def store_http_error_log(self, proxy_type, error_code, url, ip_address, domain, timestamp=None):
        global http_error_log_counter
        ts = normalize_timestamp(timestamp)
        with http_error_logs_lock:
            http_error_log_counter += 1
            http_error_logs_cache.append({
                "id": http_error_log_counter,
                "proxy_type": proxy_type,
                "error_code": error_code,
                "timestamp": ts,
                "url": url,
                "ip_address": ip_address,
                "domain": domain,
                "country": "Unknown",
                "city": "Unknown",
                "lat": None,
                "lon": None
            })
        logging.debug("Stored HTTP error log (ID %s): Proxy %s, Code %s, URL %s, IP %s, Domain %s, Timestamp: %s",
                    http_error_log_counter, proxy_type, error_code, url, ip_address, domain, ts)


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
        # Return a list copy of the FIFO queue
        return list(login_attempts_cache)

def fetch_http_error_logs():
    with http_error_logs_lock:
        # Return a list copy of the FIFO queue
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
