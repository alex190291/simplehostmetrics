# simplehostmetrics.refac/rtad_manager.py
import time
import re
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime
from database import insert_security_log, get_db_connection


# This handler processes the log changes when a file is modified
class LogHandler(FileSystemEventHandler):
    def __init__(self, event_handler):
        self.event_handler = event_handler

    def on_modified(self, event):
        # Check if the modified file is one of the log files we're watching
        if event.src_path in ["/var/log/fail2ban.log", "/var/log/secure", "/var/log/btmp"]:
            self.event_handler.process_log(event.src_path)


class RTADManager:
    def __init__(self):
        self.logs_to_watch = [
            "/var/log/fail2ban.log", "/var/log/secure", "/var/log/btmp"
        ]
        self.event_handler = LogHandler(self)  # Initialize LogHandler
        self.observer = Observer()  # Initialize Observer

    def start(self):
        # Setting up observer to watch the specified logs
        for log in self.logs_to_watch:
            self.observer.schedule(self.event_handler, log, recursive=False)
        self.observer.start()  # Start observing

    def stop(self):
        # Stop the observer when done
        self.observer.stop()
        self.observer.join()

    def process_log(self, log_file):
        with open(log_file, "r") as file:
            lines = file.readlines()
            for line in lines:
                if "Found" in line:
                    self.parse_fail2ban_log(line)
                elif "Failed password" in line or "authentication failure" in line:
                    self.parse_secure_log(line)
                elif re.match(r"^\S+\s+ssh", line):
                    self.parse_lastb_log(line)

    def parse_fail2ban_log(self, line):
        match = re.search(r'Found (\d+\.\d+\.\d+\.\d+)', line)
        if match:
            ip = match.group(1)
            action = "Banned"
            timestamp = int(time.time())
            port = 0  # No port data in fail2ban log
            insert_security_log(ip, action, timestamp, port)

    def parse_secure_log(self, line):
        match = re.search(r'Failed password for (\S+) from (\d+\.\d+\.\d+\.\d+) port (\d+)', line)
        if match:
            action = "Failed Login"
            ip = match.group(2)
            port = int(match.group(3))
            timestamp = int(time.time())
            insert_security_log(ip, action, timestamp, port)

    def parse_lastb_log(self, line):
        match = re.match(r'^\S+\s+ssh:notty\s+(\d+\.\d+\.\d+\.\d+)', line)
        if match:
            ip = match.group(1)
            action = "Failed Login"
            timestamp = int(time.time())
            port = 0  # No port in lastb log
            insert_security_log(ip, action, timestamp, port)

    def get_attack_events(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM security_log ORDER BY timestamp DESC LIMIT 10")
        rows = cursor.fetchall()
        conn.close()
        return rows

    def get_security_summary(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT port, COUNT(*) FROM security_log GROUP BY port
        """)
        rows = cursor.fetchall()
        conn.close()
        return rows

    def get_graph_data(self):
        graph_data = defaultdict(int)
        for port, timestamps in self.attack_data.items():
            for timestamp in timestamps:
                if time.time() - timestamp < 3600:  # Filter data for the last 60 minutes
                    graph_data[port] += 1
        return graph_data
