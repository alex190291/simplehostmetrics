import subprocess
import time
import logging
from datetime import datetime
import os
import re
from database import get_db_connection

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Function to insert events into the security_log table
def insert_security_log(ip, action, timestamp, port):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO security_log (ip, action, timestamp, port)
            VALUES (?, ?, ?, ?)
        """, (ip, action, timestamp, port))
        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        logging.error("Database error: %s", e)
    except Exception as e:
        logging.error("Error: %s", e)

# Function to parse and insert lastb log entries into the database
def process_lastb_logs():
    try:
        # Capture lastb output
        result = subprocess.run(['lastb', '-n', '100'], stdout=subprocess.PIPE)
        logs = result.stdout.decode('utf-8').splitlines()

        for log in logs:
            # Parse the log line
            parts = log.split()
            if len(parts) < 5:
                continue  # Skip invalid log lines

            username = parts[0]
            ip = parts[2]
            timestamp_str = " ".join(parts[3:5])  # Assuming timestamp format "Day Month Date"
            timestamp = int(time.mktime(datetime.strptime(timestamp_str, "%b %d").timetuple()))
            action = 'failed_login'
            port = 22  # Default to SSH port 22

            # Insert parsed data into the database
            insert_security_log(ip, action, timestamp, port)
            logging.info("Inserted log: %s, %s, %s, %s", username, ip, timestamp, port)

    except Exception as e:
        logging.error("Error processing lastb logs: %s", e)

# Function to parse Zoraxy reverse proxy logs
def process_zoraxy_logs():
    log_dir = '/data/zoraxy/config/log'
    log_files = [f for f in os.listdir(log_dir) if f.endswith('.log')]

    for log_file in log_files:
        log_path = os.path.join(log_dir, log_file)
        try:
            with open(log_path, 'r') as file:
                logs = file.readlines()

            for log in logs:
                # Sample log line format: [timestamp] IP - "GET /path HTTP/1.1" 404
                match = re.match(r'.*\[(.*?)\] (\S+) - ".*?" (\d{3})', log)
                if match:
                    timestamp_str = match.group(1)
                    ip = match.group(2)
                    status_code = match.group(3)

                    # Only consider 4xx and 5xx errors
                    if status_code.startswith(('4', '5')):
                        timestamp = int(time.mktime(datetime.strptime(timestamp_str, "%d/%b/%Y:%H:%M:%S").timetuple()))
                        action = f"http_error_{status_code}"
                        port = 80  # Default HTTP port for reverse proxy

                        # Insert parsed data into the database
                        insert_security_log(ip, action, timestamp, port)
                        logging.info("Inserted log from Zoraxy: %s, %s, %s, %s", ip, action, timestamp, port)

        except Exception as e:
            logging.error("Error processing Zoraxy logs from %s: %s", log_path, e)

# Function to run this process periodically
def run_periodic_log_capture():
    while True:
        process_lastb_logs()
        process_zoraxy_logs()  # Process Zoraxy logs
        # Sleep for 60 seconds before running again
        time.sleep(60)

if __name__ == "__main__":
    logging.info("Starting background process for capturing logs")
    run_periodic_log_capture()
