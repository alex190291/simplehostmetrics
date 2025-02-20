import yaml
import re
import subprocess
import os
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime
from database import get_db_connection

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Load configuration from config.yml
with open('config.yml', 'r') as f:
    app_config = yaml.safe_load(f)

# Get logs directory from config
logs_directory = app_config.get('logs_directory', '/data/npm/logs')

def get_log_files(path):
    if os.path.isfile(path):
        return [path]
    elif os.path.isdir(path):
        return [os.path.join(path, filename) for filename in os.listdir(path) if os.path.isfile(os.path.join(path, filename))]
    else:
        return []

class LogParser:
    def __init__(self):
        self.logs_directory = logs_directory
        logging.debug("LogParser initialized with logs directory: %s", self.logs_directory)
        self.setup_watchdog()

    def parse_log_files(self):
        logging.debug("Starting parse_log_files")
        self.parse_nginx_logs()
        self.parse_system_logs()

    def parse_nginx_logs(self):
        logging.debug("Parsing nginx proxy manager logs from directory: %s", self.logs_directory)
        log_files = get_log_files(self.logs_directory)
        for file in log_files:
            logging.debug("Parsing nginx log file: %s", file)
            with open(file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    self.process_nginx_log_line(line)

    def process_nginx_log_line(self, line):
        # Regex pattern for nginx proxy manager logs
        pattern = r'^(?P<timestamp>\d{1,2}/[A-Za-z]{3}/\d{4}:\d{2}:\d{2}:\d{2}\s[+\-]\d{4})\] - (?P<code1>\d{3})\s+(?P<code2>\d{3})\s+-\s+(?P<method>[A-Z]+)\s+(?P<protocol>\S+)\s+(?P<host>\S+)\s+"(?P<path>[^"]+)"\s+\[Client\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\]'
        match = re.search(pattern, line)
        if match:
            error_code = int(match.group("code2"))
            method = match.group("method")
            protocol = match.group("protocol")
            host = match.group("host")
            path = match.group("path")
            ip_address = match.group("ip")
            url = f"{protocol}://{host}{path}"
            logging.debug("Parsed nginx log: %s %s from %s", method, url, ip_address)
            self.store_http_error_log("nginx_proxy_manager", error_code, url, ip_address)
        else:
            logging.debug("No match for nginx log line: %s", line)

    def parse_system_logs(self):
        logging.debug("Parsing system logs for login attempts")
        system_log_paths = ["/var/log/secure", "/var/log/auth.log", "/var/log/fail2ban.log", "/var/log/firewalld"]
        for log_path in system_log_paths:
            if os.path.exists(log_path):
                logging.debug("Parsing system log: %s", log_path)
                self.parse_login_attempts(log_path)
            else:
                logging.warning("System log path does not exist: %s", log_path)
        # Removed continuous parsing of lastb output to handle it via a separate route

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
                    self.process_login_attempt(line)

    def store_failed_login(self, user, ip_address):
        timestamp = datetime.now().timestamp()
        failure_reason = "Failed login attempt"
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO login_attempts (user, ip_address, timestamp, failure_reason)
                          VALUES (?, ?, ?, ?)''', (user, ip_address, timestamp, failure_reason))
        conn.commit()
        logging.debug("Stored failed login attempt for user %s from IP %s", user, ip_address)

    def store_http_error_log(self, proxy_type, error_code, url, ip_address):
        timestamp = datetime.now().timestamp()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO http_error_logs (proxy_type, error_code, timestamp, url)
                          VALUES (?, ?, ?, ?)''', (proxy_type, error_code, timestamp, url))
        conn.commit()
        logging.debug("Stored HTTP error log: Proxy %s, Code %s, URL %s", proxy_type, error_code, url)

    def setup_watchdog(self):
        logging.debug("Setting up watchdog observer for nginx logs")
        event_handler = FileSystemEventHandler()
        event_handler.on_modified = self.on_modified
        observer = Observer()
        if os.path.exists(self.logs_directory):
            observer.schedule(event_handler, self.logs_directory, recursive=False)
            logging.debug("Watchdog scheduled for directory: %s", self.logs_directory)
        else:
            logging.warning("Watchdog could not schedule non-existent directory: %s", self.logs_directory)
        observer.start()

    def on_modified(self, event):
        if event.is_directory:
            return
        logging.debug("Watchdog detected modification in file: %s", event.src_path)
        self.parse_log_files()

def fetch_http_error_logs_nginx():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM http_error_logs WHERE proxy_type = ?", ("nginx_proxy_manager",))
    rows = cursor.fetchall()
    result = []
    for row in rows:
        result.append({
            "id": row["id"],
            "proxy_type": row["proxy_type"],
            "error_code": row["error_code"],
            "timestamp": row["timestamp"],
            "url": row["url"]
        })
    return result

def get_lastb_output():
    try:
        result = subprocess.run(['lastb'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            logging.error("Error running lastb: %s", result.stderr)
            return {"error": result.stderr}
        output = result.stdout.splitlines()
        return {"output": output}
    except Exception as e:
        logging.error("Exception when running lastb: %s", e)
        return {"error": str(e)}
