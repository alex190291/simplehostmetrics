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
with open('proxy_manager_logs.yaml', 'r') as f:
    config = yaml.safe_load(f)

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
    ## old implementation --------
    #def parse_proxy_log(self, log_path, proxy_type):
    #    if not os.path.exists(log_path):
    #        logging.warning("Proxy log path does not exist: %s", log_path)
    #        return

    def parse_proxy_log(self, log_path, proxy_type):
        if not os.path.exists(log_path):
            logging.warning("Proxy log path does not exist: %s", log_path)
            return
      # Verwenden von "tail -n 100", um nur die letzten 100 Zeilen zu lesen
        result = subprocess.run(['tail', '-n', '100', log_path],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE)
        if result.returncode != 0:
            logging.error("Error running tail on %s: %s", log_path, result.stderr.decode())
            return
        for line in result.stdout.decode().splitlines():
            line = line.strip()
            if not line:
                continue
            logging.debug("Processing proxy log line: %s", line)
            self.process_http_error_log(line, proxy_type)
        with open(log_path, 'r') as log_file:
            for line in log_file:
                line = line.strip()
                if not line:
                    continue
                logging.debug("Processing proxy log line: %s", line)
                self.process_http_error_log(line, proxy_type)

    def parse_system_logs(self):
        logging.debug("Parsing system logs for login attempts")
        # Try common system log paths for authentication logs
        system_log_paths = ["/var/log/secure", "/var/log/auth.log", "/var/log/fail2ban.log"]
        for log_path in system_log_paths:
            if os.path.exists(log_path):
                logging.debug("Parsing system log: %s", log_path)
                self.parse_login_attempts(log_path)
            else:
                logging.warning("System log path does not exist: %s", log_path)
        self.parse_lastb_output()

    def process_http_error_log(self, line, proxy_type):
        # Pattern updated to allow an empty origin field
        pattern1 = r"\[[^\]]+\]\s+\[[^\]]+\]\s+\[origin:(?P<origin>[^\]]*)\]\s+\[client\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\]\s+(?P<method>[A-Z]+)\s+(?P<url>\S+)\s+(?P<code>\d{3})"
        match = re.search(pattern1, line)
        if match:
            ip_address = match.group("ip")
            url = match.group("url")
            error_code = int(match.group("code"))
            # Only store if the error code indicates an error (>= 400)
            if error_code >= 400:
                logging.debug("Matched HTTP error log (pattern1): IP %s, URL %s, Code %s, Proxy %s", ip_address, url, error_code, proxy_type)
                self.store_http_error_log(proxy_type, error_code, url, ip_address)
            else:
                logging.debug("HTTP log matched but not an error (code < 400): %s", line)
            return

        logging.debug("No HTTP error log match for line: %s", line)

    def process_login_attempt(self, line):
        # Pattern for "Failed password for ..." lines.
        pattern_failed = r"Failed password for (?:invalid user )?(?P<user>\S+) from (?P<ip>\S+) port \d+"
        match = re.search(pattern_failed, line)
        if match:
            user = match.group("user")
            ip_address = match.group("ip")
            logging.debug("Matched login attempt (failed password): user %s, IP %s", user, ip_address)
            self.store_failed_login(user, ip_address)
            return

        # Pattern for "Invalid user ..." lines.
        pattern_invalid = r"Invalid user (?P<user>\S+) from (?P<ip>\S+) port \d+"
        match = re.search(pattern_invalid, line)
        if match:
            user = match.group("user")
            ip_address = match.group("ip")
            logging.debug("Matched login attempt (invalid user): user %s, IP %s", user, ip_address)
            self.store_failed_login(user, ip_address)
            return

        logging.debug("No login attempt match for line: %s", line)

    ## old implementation --------
    #def parse_login_attempts(self, log_path):
    #    if not os.path.exists(log_path):
    #        logging.warning("Login attempt log path does not exist: %s", log_path)
    #        return
    #    with open(log_path, 'r') as log_file:
    #        for line in log_file:
    #            line = line.strip()
    #            if not line:
    #                continue
    #            logging.debug("Processing system log line for login attempt: %s", line)
    #            self.process_login_attempt(line)

def parse_login_attempts(self, log_path):
    if not os.path.exists(log_path):
        logging.warning("Login attempt log path does not exist: %s", log_path)
        return
    # Verwenden von "tail -n 100", um nur die letzten 100 Zeilen zu lesen
    result = subprocess.run(['tail', '-n', '100', log_path],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
    if result.returncode != 0:
        logging.error("Error running tail on %s: %s", log_path, result.stderr.decode())
        return
    for line in result.stdout.decode().splitlines():
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

    def store_http_error_log(self, proxy_type, error_code, url, ip_address):
        timestamp = datetime.now().timestamp()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO http_error_logs (proxy_type, error_code, timestamp, url)
                          VALUES (?, ?, ?, ?)''', (proxy_type, error_code, timestamp, url))
        conn.commit()
        logging.debug("Stored HTTP error log: Proxy %s, Code %s, URL %s", proxy_type, error_code, url)

    def setup_watchdog(self):
        logging.debug("Setting up watchdog observer")
        event_handler = FileSystemEventHandler()
        event_handler.on_modified = self.on_modified
        observer = Observer()
        for log_config in self.proxy_logs:
            path = log_config.get('path')
            if os.path.exists(path):
                # Watch the directory containing the log file to catch modifications
                directory = os.path.dirname(path)
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

# Functions for the API endpoint to fetch processed log data

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
            "url": row["url"]
        })
    return result
