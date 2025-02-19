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
        # Regex patterns to capture error codes like 403, 404, 500, etc.
        pattern = r"(\d+\.\d+\.\d+\.\d+) - - \[.*\] \"[A-Z]+ (\/[^\s]+) HTTP/1.1\" (\d{3})"
        match = re.match(pattern, line)
        if match:
            ip_address = match.group(1)
            url = match.group(2)
            error_code = int(match.group(3))
            self.store_http_error_log(proxy_type, error_code, url, ip_address)

    def process_login_attempt(self, line):
        # Example: Failed password attempt in /var/log/secure
        pattern = r"Failed password for (invalid user )?(\S+) from (\S+) port \d+ ssh2"
        match = re.match(pattern, line)
        if match:
            user = match.group(2)
            ip_address = match.group(3)
            self.store_failed_login(user, ip_address)

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

# API Route Integration (for real-time access to log data)
@app.route('/rtad_logs')
def get_rtad_logs():
    # Fetch and return processed logs
    return jsonify({
        'login_attempts': fetch_login_attempts(),
        'http_error_logs': fetch_http_error_logs()
    })

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
