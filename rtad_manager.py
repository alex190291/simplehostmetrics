import yaml
import re
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime
from database import get_db_connection
import os

# Load proxy log configurations from YAML
with open('proxy_manager_logs.yaml', 'r') as f:
    config = yaml.safe_load(f)

class LogParser:
    def __init__(self):
        self.proxy_logs = config['logfiles']
        self.setup_watchdog()

    def parse_log_files(self):
        for log_config in self.proxy_logs:
            self.parse_proxy_log(log_config['path'], log_config['proxy_type'])
        self.parse_system_logs()

    def parse_proxy_log(self, log_path, proxy_type):
        if not os.path.exists(log_path):
            return

        with open(log_path, 'r') as log_file:
            for line in log_file:
                self.process_http_error_log(line, proxy_type)

    def parse_system_logs(self):
        # Parse /var/log/secure and other logs for failed login attempts
        self.parse_login_attempts("/var/log/secure")
        self.parse_lastb_output()

    def process_http_error_log(self, line, proxy_type):
        """
        Updated to try matching multiple HTTP log formats.
        This example handles our format:
        [2025-02-19 06:36:53.313612] [router:host-http] [origin:proxy-sinusbot] [client 178.201.9.113] GET /api/v1/bot/i/ee8abb70-248b-4f43-87ea-a975f282e9fe/status 200
        """
        # First attempt: match our custom bracketed log format
        pattern1 = r"\[[^\]]+\]\s+\[[^\]]+\]\s+\[origin:(?P<origin>[^\]]+)\]\s+\[client\s+(?P<ip>\d+\.\d+\.\d+\.\d+)\]\s+(?P<method>[A-Z]+)\s+(?P<url>\S+)\s+(?P<code>\d{3})"
        match = re.search(pattern1, line)
        if match:
            ip_address = match.group("ip")
            url = match.group("url")
            error_code = int(match.group("code"))
            # Only store error logs if code indicates error (e.g., >= 400)
            if error_code >= 400:
                logging.debug("Matched HTTP error log (pattern1): IP %s, URL %s, Code %s, Proxy %s", ip_address, url, error_code, proxy_type)
                self.store_http_error_log(proxy_type, error_code, url, ip_address)
            else:
                logging.debug("HTTP log matched but not an error (code < 400): %s", line)
            return

        # Additional patterns can be added here if necessary
        logging.debug("No HTTP error log match for line: %s", line)

    def process_login_attempt(self, line):
        """
        Updated to handle multiple login attempt formats.
        Handles:
        - 'Failed password for [invalid user] <user> from <ip> ...'
        - 'Invalid user <user> from <ip> port ...'
        """
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

        # Optionally add a pattern for "authentication failure" or other messages
        logging.debug("No login attempt match for line: %s", line)

    def parse_login_attempts(self, log_path):
        if not os.path.exists(log_path):
            return

        with open(log_path, 'r') as log_file:
            for line in log_file:
                self.process_login_attempt(line)

    def parse_lastb_output(self):
        # Parse the output of 'lastb' to capture failed login attempts
        result = subprocess.run(['lastb'], stdout=subprocess.PIPE)
        output = result.stdout.decode()
        for line in output.splitlines():
            self.process_login_attempt(line)

    def store_failed_login(self, user, ip_address):
        timestamp = datetime.now().timestamp()
        failure_reason = "Failed login attempt"
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO login_attempts (user, ip_address, timestamp, failure_reason)
                          VALUES (?, ?, ?, ?)''', (user, ip_address, timestamp, failure_reason))
        conn.commit()

    def store_http_error_log(self, proxy_type, error_code, url, ip_address):
        timestamp = datetime.now().timestamp()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO http_error_logs (proxy_type, error_code, timestamp, url)
                          VALUES (?, ?, ?, ?)''', (proxy_type, error_code, timestamp, url))
        conn.commit()

    def setup_watchdog(self):
        # Monitor log files for real-time changes
        event_handler = FileSystemEventHandler()
        event_handler.on_modified = self.on_modified
        observer = Observer()
        for log_config in self.proxy_logs:
            observer.schedule(event_handler, log_config['path'], recursive=False)
        observer.start()

    def on_modified(self, event):
        if event.is_directory:
            return
        self.parse_log_files()

def fetch_login_attempts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM login_attempts ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    return [{'user': row['user'], 'ip': row['ip_address'], 'timestamp': row['timestamp']} for row in rows]

def fetch_http_error_logs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM http_error_logs ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    return [{'proxy_type': row['proxy_type'], 'error_code': row['error_code'], 'url': row['url'], 'timestamp': row['timestamp']} for row in rows]
