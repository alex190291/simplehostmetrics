import yaml
import re
import os
import logging
import threading
import time
import requests
import zipfile
import geoip2.database
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from threading import Timer

# Precompiled regex patterns
REGEX_ZORAXY = re.compile(
    r"\[[^\]]+\]\s+\[[^\]]+\]\s+\[origin:(?P<origin>[^\]]*)\]\s+\[client\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\]\s+(?P<method>[A-Z]+)\s+(?P<url>\S+)\s+(?P<code>\d{3})"
)
REGEX_NPM = re.compile(
    r'^\[(?P<timestamp>[^\]]+)\]\s+(?P<code>\d{3})\s+-\s+(?P<method>[A-Z]+|-)\s+(?P<protocol>\S+)\s+(?P<host>\S+)\s+"(?P<url>[^"]+)"\s+\[Client\s+(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\]'
)
# Precompiled regex for login attempts
RE_LOGIN_FAILED = re.compile(
    r"Failed password for (?:invalid user )?(?P<user>\S+) from (?P<ip>\S+)(?:\s+\((?P<host>[^\)]+)\))? port \d+"
)
RE_LOGIN_INVALID = re.compile(
    r"Invalid user (?P<user>\S+) from (?P<ip>\S+)(?:\s+\((?P<host>[^\)]+)\))? port \d+"
)

# Global variables for file offset tracking and caches
file_offsets = {}
file_offsets_lock = threading.Lock()
# In-memory caches for logging (max. 500 entries)
login_attempts_cache = []
http_error_logs_cache = []
login_attempts_lock = threading.Lock()
http_error_logs_lock = threading.Lock()
# Global cache for IP country and city info with TTL support
# Structure: { normalized_ip: {"country": str, "city": str, "timestamp": float} }
ip_country_cache = {}
ip_country_cache_lock = threading.Lock()
# Path to the local GeoLite2-City database (GeoLite2-City.mmdb)
GEOIP_DB_PATH = '/usr/share/GeoIP/GeoLite2-City.mmdb'
# Load configuration from config.yml
with open('config.yml', 'r') as f:
    config = yaml.safe_load(f)

# New helper function to normalize timestamps
def normalize_timestamp(ts=None):
    if ts is None:
        ts = time.time()
    if isinstance(ts, datetime):
        return ts.isoformat()
    elif isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts).isoformat()
    else:
        raise TypeError(f"Invalid type for timestamp: {type(ts)}")

# Existing wrapper function on normalize_timestamp remains unchanged
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
    """Downloads the latest GeoLite2-City database from the specified URL."""
    url = "https://git.io/GeoLite2-City.mmdb"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        with open(db_path, "wb") as f:
            f.write(response.content)
        logging.info("GeoLite2-City database successfully downloaded to %s.", db_path)
    except Exception as e:
        logging.error("Error downloading GeoLite2-City database: %s", e)

def ensure_geolite2_db(db_path, max_age_seconds=86400):
    """
    Ensures that the GeoLite2 database exists and is not older than max_age_seconds.
    By default, max_age_seconds is 1 day (86400 seconds).
    """
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

##############################
# GeoIP Lookup Functions using the local GeoLite2-City database
##############################
def get_geo_info_from_db(ip):
    """Retrieves country code and city name for the given IP using the local GeoLite2-City database."""
    ip = ip.strip()
    ensure_geolite2_db(GEOIP_DB_PATH)
    try:
        with geoip2.database.Reader(GEOIP_DB_PATH) as reader:
            response = reader.city(ip)
            country = response.country.iso_code if response and response.country.iso_code else "Unknown"
            city = response.city.name if response and response.city.name else "Unknown"
            return {"country": country, "city": city}
    except Exception as e:
        logging.error("Error during GeoIP lookup for IP %s: %s", ip, e)
        return {"country": "Unknown", "city": "Unknown"}

def get_geo_info_cached(ip, ttl=3600):
    """
    Returns the country and city information for an IP address using a TTL-based cache.
    If the values are "Unknown", a shorter TTL (60 seconds) is used.
    """
    ip = ip.strip()
    unknown_ttl = 60
    with ip_country_cache_lock:
        if ip in ip_country_cache:
            entry = ip_country_cache[ip]
            if entry["country"] != "Unknown" and entry["city"] != "Unknown":
                if (time.time() - entry["timestamp"]) < ttl:
                    return {"country": entry["country"], "city": entry["city"]}
            else:
                if (time.time() - entry["timestamp"]) < unknown_ttl:
                    return {"country": entry["country"], "city": entry["city"]}
    info = get_geo_info_from_db(ip)
    with ip_country_cache_lock:
        ip_country_cache[ip] = {"country": info["country"], "city": info["city"], "timestamp": time.time()}
    return info

##############################
# GeoNames Dataset Download, Unzip, Load, and Lookup Functions
##############################
# Using the cities500 dataset from GeoNames
GEONAMES_ZIP_URL = "https://download.geonames.org/export/dump/cities500.zip"
GEONAMES_ZIP_PATH = os.path.join("data", "cities500.zip")
GEONAMES_TXT_PATH = os.path.join("data", "cities500.txt")
# Global dictionary for GeoNames data: key = lower-case city name, value = list of records
geonames_data = {}

def download_geonames_dataset():
    """Downloads the GeoNames cities500.zip dataset."""
    logging.info("Downloading GeoNames dataset...")
    try:
        os.makedirs("data", exist_ok=True)
        response = requests.get(GEONAMES_ZIP_URL, stream=True, timeout=60)
        response.raise_for_status()
        with open(GEONAMES_ZIP_PATH, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        logging.info("GeoNames dataset downloaded to %s.", GEONAMES_ZIP_PATH)
    except Exception as e:
        logging.error("Error downloading GeoNames dataset: %s", e)

def unzip_geonames_dataset():
    """Unzips the downloaded GeoNames dataset."""
    logging.info("Unzipping GeoNames dataset...")
    try:
        with zipfile.ZipFile(GEONAMES_ZIP_PATH, "r") as zip_ref:
            zip_ref.extractall("data")
        logging.info("GeoNames dataset unzipped into 'data' directory.")
    except Exception as e:
        logging.error("Error unzipping GeoNames dataset: %s", e)

def load_geonames_data():
    """Loads the GeoNames data from cities500.txt into the global cache."""
    global geonames_data
    logging.info("Loading GeoNames data from %s...", GEONAMES_TXT_PATH)
    geonames_data = {}
    try:
        with open(GEONAMES_TXT_PATH, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split("\t")
                if len(parts) < 19:
                    continue
                # Columns: geonameid, name, asciiname, alternatenames, latitude, longitude, feature class, feature code, country code, ...
                geonameid = parts[0]
                name = parts[1]
                asciiname = parts[2]
                alternatenames = parts[3]
                lat = parts[4]
                lon = parts[5]
                feature_class = parts[6]
                feature_code = parts[7]
                population = parts[14]
                # Only consider populated places (feature_class "P")
                if feature_class != "P":
                    continue
                try:
                    lat = float(lat)
                    lon = float(lon)
                    population = int(population)
                except:
                    continue
                record = {
                    "geonameid": geonameid,
                    "name": name,
                    "asciiname": asciiname,
                    "alternatenames": alternatenames.split(","),
                    "lat": lat,
                    "lon": lon,
                    "country_code": parts[8],
                    "population": population
                }
                keys = set()
                keys.add(name.lower())
                keys.add(asciiname.lower())
                for alt in record["alternatenames"]:
                    keys.add(alt.lower())
                for key in keys:
                    if key in geonames_data:
                        geonames_data[key].append(record)
                    else:
                        geonames_data[key] = [record]
        logging.info("GeoNames data loaded: %d keys cached.", len(geonames_data))
    except Exception as e:
        logging.error("Error loading GeoNames data: %s", e)

def lookup_city(city_name):
    """
    Looks up a city in the GeoNames dataset and returns (lat, lon) from the record with the highest population.
    Returns None if no match is found.
    """
    if not city_name:
        return None
    key = city_name.lower()
    records = geonames_data.get(key)
    if not records:
        return None
    best = max(records, key=lambda r: r["population"])
    return best["lat"], best["lon"]

def update_geonames_dataset():
    """Performs download, unzip, and load of the GeoNames dataset."""
    download_geonames_dataset()
    unzip_geonames_dataset()
    load_geonames_data()

def schedule_geonames_update():
    """Updates the GeoNames dataset on app launch and schedules an update every 24 hours in a background thread."""
    threading.Thread(target=update_geonames_dataset, daemon=True).start()
    Timer(86400, schedule_geonames_update).start()

##############################
# LogParser Class (mostly unchanged, except API data can now use GeoNames lookup)
##############################
class LogParser:
    def __init__(self):
        self.proxy_logs = config.get('logfiles', [])
        logging.debug("LogParser initialized with proxy logs: %s", self.proxy_logs)
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
            logging.error("Error processing file %s: %s", file_path, e)

    def process_files_concurrently(self, files, line_processor):
        with ThreadPoolExecutor() as executor:
            futures = [executor.submit(self.process_log_file, file, line_processor) for file in files]
            for future in futures:
                future.result()

    def parse_log_files(self):
        logging.debug("Starting parse_log_files")
        for log_config in self.proxy_logs:
            path = log_config.get('path')
            proxy_type = log_config.get('proxy_type')
            if not os.path.exists(path):
                logging.warning("Proxy log path does not exist: %s", path)
                continue
            files = get_log_files(path)
            self.process_files_concurrently(files, lambda line: self.process_http_error_log(line, proxy_type))
        system_log_paths = ["/var/log/secure", "/var/log/auth.log", "/var/log/fail2ban.log", "/var/log/firewalld"]
        for log_path in system_log_paths:
            if os.path.exists(log_path):
                files = get_log_files(log_path)
                self.process_files_concurrently(files, self.process_login_attempt)
            else:
                logging.warning("System log path does not exist: %s", log_path)
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

    def process_login_attempt(self, line):
        match = RE_LOGIN_FAILED.search(line)
        if not match:
            match = RE_LOGIN_INVALID.search(line)
        if match:
            user = match.group("user")
            ip_address = match.group("ip")
            host = match.group("host") if "host" in match.groupdict() else None
            logging.debug("Login attempt detected: user %s, IP %s, Host %s", user, ip_address, host)
            self.store_failed_login(user, ip_address, host)
        else:
            logging.debug("No match for login attempt in line: %s", line)

    def parse_btmp_file(self):
        logging.debug("Parsing /var/log/btmp using utmp.read")
        try:
            import utmp
        except ImportError:
            logging.error("python‑utmp library is not installed. Please install it to parse /var/log/btmp directly.")
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
                ip_address = host  # Use host as IP if separate IP is not available
                logging.debug("Btmp record: Time: %s, Type: %s, User: %s, Host/IP: %s",
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
        logging.debug("Stored failed login: user %s, IP %s, Host %s, Timestamp: %s",
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
        logging.debug("Watchdog: Change detected in file: %s", event.src_path)
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
    with login_attempts_lock:
        for attempt in login_attempts_cache:
            ip = attempt["ip_address"].strip()
            info = get_geo_info_cached(ip)
            attempt["country"] = info["country"]
            attempt["city"] = info["city"]
        # If lat/lon are missing and a city is provided, use GeoNames lookup
        for attempt in login_attempts_cache:
            if (attempt.get("lat") is None or attempt.get("lon") is None) and attempt.get("city") != "Unknown":
                coords = lookup_city(attempt.get("city"))
                if coords:
                    attempt["lat"], attempt["lon"] = coords
    with http_error_logs_lock:
        for log in http_error_logs_cache:
            ip = log["ip_address"].strip()
            info = get_geo_info_cached(ip)
            log["country"] = info["country"]
            log["city"] = info["city"]
        for log in http_error_logs_cache:
            if (log.get("lat") is None or log.get("lon") is None) and log.get("city") != "Unknown":
                coords = lookup_city(log.get("city"))
                if coords:
                    log["lat"], log["lon"] = coords

def update_country_info_job():
    while True:
        update_missing_country_info()
        time.sleep(10)

##############################
# Initialization: GeoNames Dataset
##############################
# At app start, schedule the GeoNames dataset update (download, unzip, load)
schedule_geonames_update()
