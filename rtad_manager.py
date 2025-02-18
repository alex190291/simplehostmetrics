# rtad_manager.py
import os
import re
import time
import threading
import requests
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from database import get_db_connection, insert_security_log

# Global variable to cache the server's geolocation
SERVER_GEOLOCATION = None

# Global dictionary to track file offsets for log files
file_offsets = {}

# List of log files to monitor
LOG_FILES = [
    "/var/log/firewalld",
    "/var/log/fail2ban.log",
    "/var/log/secure",
    "/var/log/auth.log"
]

def get_server_geolocation():
    """
    Retrieves and caches the server's geolocation by querying its public IP.
    """
    global SERVER_GEOLOCATION
    if SERVER_GEOLOCATION is None:
        try:
            response = requests.get("https://api.ipify.org?format=json", timeout=5)
            if response.status_code == 200:
                ip = response.json().get("ip")
                SERVER_GEOLOCATION = get_geolocation(ip)
        except Exception as e:
            print("Error fetching server public IP:", e)
    return SERVER_GEOLOCATION

def get_geolocation(ip):
    """
    Retrieves geolocation for a given IP.
    Checks the ip_cache table first; if absent or stale, queries ip-api.com and falls back to freegeoip.app.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT latitude, longitude, country, city, last_update FROM ip_cache WHERE ip=?", (ip,))
    row = cursor.fetchone()
    current_time = int(time.time())
    if row:
        # Check if cached data is less than 24 hours old (86400 seconds)
        if current_time - row["last_update"] < 86400:
            conn.close()
            return {
                "lat": row["latitude"],
                "lon": row["longitude"],
                "country": row["country"],
                "city": row["city"]
            }
    # Query ip-api.com
    try:
        response = requests.get(f"http://ip-api.com/json/{ip}?fields=status,message,lat,lon,country,city", timeout=5)
        data = response.json()
        if data.get("status") == "success":
            geodata = {
                "lat": data.get("lat"),
                "lon": data.get("lon"),
                "country": data.get("country"),
                "city": data.get("city")
            }
        else:
            # Fallback to freegeoip.app
            response = requests.get(f"https://freegeoip.app/json/{ip}", timeout=5)
            data = response.json()
            geodata = {
                "lat": data.get("latitude"),
                "lon": data.get("longitude"),
                "country": data.get("country_name"),
                "city": data.get("city")
            }
    except Exception as e:
        print("Geolocation error for IP", ip, ":", e)
        geodata = {"lat": None, "lon": None, "country": None, "city": None}
    # Update cache
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO ip_cache (ip, latitude, longitude, country, city, last_update)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (ip, geodata["lat"], geodata["lon"], geodata["country"], geodata["city"], current_time))
        conn.commit()
    except Exception as e:
        print("Database error while caching geolocation:", e)
    conn.close()
    return geodata

def parse_log_line(line):
    """
    Parses a log line and returns an event dictionary if a security event is detected.
    """
    event = None
    # Extract an IP address from the line
    ip_match = re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', line)
    ip = ip_match.group(0) if ip_match else None
    # Attempt to extract a port number (e.g., "port 22")
    port_match = re.search(r'port (\d+)', line, re.IGNORECASE)
    port = port_match.group(1) if port_match else ""
    timestamp = int(time.time())
    extra_info = line.strip()

    if "Failed password" in line or "authentication failure" in line:
        event = {"ip": ip, "action": "failed_login", "timestamp": timestamp, "port": port, "extra_info": extra_info}
    elif "DROP" in line or "firewall" in line:
        event = {"ip": ip, "action": "firewall_drop", "timestamp": timestamp, "port": port, "extra_info": extra_info}
    return event

class LogFileEventHandler(FileSystemEventHandler):
    """
    Custom event handler that processes new lines added to a log file.
    """
    def __init__(self, filepath):
        self.filepath = filepath
        # Initialize file offset to the current end of file
        if os.path.exists(self.filepath):
            with open(self.filepath, "rb") as f:
                f.seek(0, os.SEEK_END)
                file_offsets[self.filepath] = f.tell()
        else:
            file_offsets[self.filepath] = 0

    def on_modified(self, event):
        if event.src_path != self.filepath:
            return
        try:
            with open(self.filepath, "r") as f:
                # Seek to the last read offset
                f.seek(file_offsets.get(self.filepath, 0))
                lines = f.readlines()
                file_offsets[self.filepath] = f.tell()
                for line in lines:
                    event_data = parse_log_line(line)
                    if event_data and event_data["ip"]:
                        insert_security_log(
                            event_data["ip"],
                            event_data["action"],
                            event_data["timestamp"],
                            event_data["port"],
                            event_data["extra_info"]
                        )
        except Exception as e:
            print(f"Error processing file {self.filepath}: {e}")

def start_log_monitors():
    """
    Initializes and starts file system watchers for the specified log files.
    """
    observers = []
    for logfile in LOG_FILES:
        if os.path.exists(logfile):
            event_handler = LogFileEventHandler(logfile)
            observer = Observer()
            directory = os.path.dirname(logfile)
            observer.schedule(event_handler, path=directory, recursive=False)
            observer.start()
            observers.append(observer)
        else:
            print(f"Log file {logfile} does not exist. Skipping.")
    # Maintain the observers in a background thread
    def observe():
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            for obs in observers:
                obs.stop()
            for obs in observers:
                obs.join()
    thread = threading.Thread(target=observe, daemon=True)
    thread.start()

# Start monitoring log files as soon as this module is imported
start_log_monitors()

def get_attack_events(limit=100):
    """
    Retrieves the latest security events from the database and enriches them with geolocation data.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM security_log ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    events = []
    server_geo = get_server_geolocation()
    for row in rows:
        attacker_geo = get_geolocation(row["ip"]) if row["ip"] else {"lat": None, "lon": None, "country": None, "city": None}
        events.append({
            "id": row["id"],
            "ip": row["ip"],
            "action": row["action"],
            "timestamp": row["timestamp"],
            "port": row["port"],
            "extra_info": row["extra_info"],
            "attacker_geo": attacker_geo,
            "server_geo": server_geo
        })
    conn.close()
    return events

def get_security_summary():
    """
    Computes an aggregated summary of security events.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total FROM security_log")
    total = cursor.fetchone()["total"]
    cursor.execute("SELECT COUNT(*) as failed FROM security_log WHERE action='failed_login'")
    failed = cursor.fetchone()["failed"]
    cursor.execute("SELECT COUNT(DISTINCT ip) as blocked FROM security_log WHERE action='firewall_drop'")
    blocked = cursor.fetchone()["blocked"]
    conn.close()
    return {
        "total_events": total,
        "failed_logins": failed,
        "blocked_ips": blocked
    }
