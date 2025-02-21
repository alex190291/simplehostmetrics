import yaml
import re
import subprocess
import os
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime
from database import get_db_connection

# Set up logging for debugging purposes
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Load proxy log configurations from YAML
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
        logging.debug("LogParser initialized with proxy logs: %s", self.proxy_logs)
        self.setup_watchdog()

    def parse_log_files(self):
        logging.debug("Starting parse_log_files")
        for log_config in self.proxy_logs:
            path = log_config.get('path')
            proxy_type = log_config.get('proxy_type')
            logging.debug("Parsing proxy log: %s (type: %s)", path, proxy_type)
            self.parse_proxy_log(path, proxy_type)
        self.parse_system_logs()

    def parse_proxy_log(self, log_path, proxy_type):
        if not os.path.exists(log_path):
            logging.warning("Proxy log path does not exist: %s", log_path)
            return
        log_files = get_log_files(log_path)
        for file in log_files:
            logging.debug("Parsing proxy log file: %s", file)
            with open(file, 'r') as log_file:
                for line in log_file:
                    line = line.strip()
                    if not line:
                        continue
                    logging.debug("Processing proxy log line: %s", line)
                    self.process_http_error_log(line, proxy_type)

    def parse_system_logs(self):
        logging.debug("Parsing system logs for login attempts")
        system_log_paths = ["/var/log/secure", "/var/log/auth.log", "/var/log/fail2ban.log", "/var/log/firewalld"]
        for log_path in system_log_paths:
            if os.path.exists(log_path):
                logging.debug("Parsing system log: %s", log_path)
                self.parse_login_attempts(log_path)
            else:
                logging.warning("System log path does not exist: %s", log_path)
        self.parse_lastb_output()

    def process_http_error_log(self, line, proxy_type):
        # Wähle Regex basierend auf proxy_type:
        if proxy_type == "zoraxy":
            # Vorheriger Regex für zoraxy; erfasst 'origin' als Domain.
            pattern = r"\[[^\]]+\]\s+\[[^\]]+\]\s+\[origin:(?P<origin>[^\]]*)\]\s+\[client\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\]\s+(?P<method>[A-Z]+)\s+(?P<url>\S+)\s+(?P<code>\d{3})"
        elif proxy_type == "npm":
            # Aktueller Regex für npm; erfasst 'host' als Domain.
            pattern = r'^\[(?P<timestamp>[^\]]+)\]\s+(?P<code>\d{3})\s+-\s+(?P<method>[A-Z]+|-)\s+(?P<protocol>\S+)\s+(?P<host>\S+)\s+"(?P<url>[^"]+)"\s+\[Client\s+(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\]'
        else:
            logging.debug("Unknown proxy_type '%s'. Using npm regex as default.", proxy_type)
            pattern = r'^\[(?P<timestamp>[^\]]+)\]\s+(?P<code>\d{3})\s+-\s+(?P<method>[A-Z]+|-)\s+(?P<protocol>\S+)\s+(?P<host>\S+)\s+"(?P<url>[^"]+)"\s+\[Client\s+(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\]'

        match = re.search(pattern, line)
        if match:
            ip_address = match.group("ip")
            error_code = int(match.group("code"))
            # Ermittlung des Domain-Werts anhand des proxy_type
            if proxy_type == "zoraxy":
                domain = match.group("origin")
                url = match.group("url")
            else:  # npm or default
                domain = match.group("host")
                url = match.group("url")
            # Nur speichern, wenn der Error-Code einen Fehler anzeigt (>= 400)
            if error_code >= 400:
                logging.debug("Matched HTTP error log: IP %s, Domain %s, URL %s, Code %s, Proxy %s",
                              ip_address, domain, url, error_code, proxy_type)
                self.store_http_error_log(proxy_type, error_code, url, ip_address, domain)
            else:
                logging.debug("HTTP log matched but not an error (code < 400): %s", line)
            return

        logging.debug("No HTTP error log match for line: %s", line)

    def process_login_attempt(self, line):
        pattern_failed = r"Failed password for (?:invalid user )?(?P<user>\S+) from (?P<ip>\S+) port \d+"
        match = re.search(pattern_failed, line)
        if match:
            user = match.group("user")
            ip_address = match.group("ip")
            logging.debug("Matched login attempt (failed password): user %s, IP %s", user, ip_address)
            self.store_failed_login(user, ip_address)
            return

        pattern_invalid = r"Invalid user (?P<user>\S+) from (?P<ip>\S+) port \d+"
        match = re.search(pattern_invalid, line)
        if match:
            user = match.group("user")
            ip_address = match.group("ip")
            logging.debug("Matched login attempt (invalid user): user %s, IP %s", user, ip_address)
            self.store_failed_login(user, ip_address)
            return

        logging.debug("No login attempt match for line: %s", line)

    def parse_login_attempts(self, log_path):
        if not os.path.exists(log_path):
            logging.warning("Login attempt log path does not exist: %s", log_path)
            return
        log_files = get_log_files(log_path)
        for file in log_files:
            logging.debug("Parsing login attempt log file: %s", file)
            with open(file, 'r') as log_file:
                for line in log_file:
                    line = line.strip()
                    if not line:
                        continue
                    logging.debug("Processing system log line for login attempt: %s", line)
                    self.process_login_attempt(line)

    def parse_lastb_output(self):
        logging.debug("Parsing output of lastb")
        try:
            result = subprocess.run(['lastb'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode != 0:
                logging.error("Error running lastb: %s", result.stderr.decode())
                return
            output = result.stdout.decode()
            for line in output.splitlines():
                line = line.strip()
                if not line:
                    continue
                logging.debug("Processing lastb line: %s", line)
                self.process_login_attempt(line)
        except Exception as e:
            logging.error("Exception when running lastb: %s", e)

    def store_failed_login(self, user, ip_address):
        timestamp = datetime.now().timestamp()
        failure_reason = "Failed login attempt"
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO login_attempts (user, ip_address, timestamp, failure_reason)
                          VALUES (?, ?, ?, ?)''', (user, ip_address, timestamp, failure_reason))
        conn.commit()
        logging.debug("Stored failed login attempt for user %s from IP %s", user, ip_address)

    def store_http_error_log(self, proxy_type, error_code, url, ip_address, domain):
        timestamp = datetime.now().timestamp()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO http_error_logs (proxy_type, error_code, timestamp, url, ip_address, domain)
                          VALUES (?, ?, ?, ?, ?, ?)''', (proxy_type, error_code, timestamp, url, ip_address, domain))
        conn.commit()
        logging.debug("Stored HTTP error log: Proxy %s, Code %s, URL %s, IP %s, Domain %s",
                      proxy_type, error_code, url, ip_address, domain)

    def setup_watchdog(self):
        logging.debug("Setting up watchdog observer")
        event_handler = FileSystemEventHandler()
        event_handler.on_modified = self.on_modified
        observer = Observer()
        for log_config in self.proxy_logs:
            path = log_config.get('path')
            if os.path.exists(path):
                directory = path if os.path.isdir(path) else os.path.dirname(path)
                logging.debug("Scheduling watchdog for directory: %s", directory)
                observer.schedule(event_handler, directory, recursive=False)
            else:
                logging.warning("Watchdog could not schedule non-existent path: %s", path)
        observer.start()

    def on_modified(self, event):
        if event.is_directory:
            return
        logging.debug("Watchdog detected modification in file: %s", event.src_path)
        self.parse_log_files()

def fetch_login_attempts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM login_attempts ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    result = []
    for row in rows:
        result.append({
            "id": row["id"],
            "user": row["user"],
            "ip_address": row["ip_address"],
            "timestamp": row["timestamp"],
            "failure_reason": row["failure_reason"]
        })
    return result

def fetch_http_error_logs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM http_error_logs ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    result = []
    for row in rows:
        result.append({
            "id": row["id"],
            "proxy_type": row["proxy_type"],
            "error_code": row["error_code"],
            "timestamp": row["timestamp"],
            "url": row["url"],
            "ip_address": row["ip_address"],
            "domain": row["domain"]
        })
    return result
