# simplehostmetrics.refac/rtad_manager.py
import subprocess
import time
import logging
import re
from datetime import datetime
from database import get_db_connection
from app import app # Quick fix: Import app for logging
import sqlite3
# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Function to insert events into the security_log table
def insert_security_log(ip, action, timestamp, port, extra_info=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO security_log (ip, action, timestamp, port, extra_info)
            VALUES (?, ?, ?, ?, ?)
        """, (ip, action, timestamp, port, extra_info))
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
        parsed_events = [] # list to store parsed events

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
            parsed_events.append({'ip': ip, 'action': action, 'timestamp': timestamp, 'port': port}) # add parsed event

        return parsed_events # return list of parsed events


    except Exception as e:
        logging.error("Error processing lastb logs: %s", e)
        return [] # Return empty list in case of error


# Function to parse and insert HTTP error logs from Zoraxy reverse proxy logs
def process_zoraxy_logs():
    log_file_path = '/data/zoraxy/config/log'  # Path to Zoraxy logs
    try:
        with open(log_file_path, 'r') as log_file:
            logs = log_file.readlines()
        parsed_events = [] # list to store parsed events


        # Regular expression to capture HTTP error logs (e.g., 4xx, 5xx errors)
        error_pattern = r'(?P<ip>\d+\.\d+\.\d+\.\d+).*"(GET|POST|PUT|DELETE|HEAD) .*(?P<status_code>\d{3})'

        for log in logs:
            match = re.search(error_pattern, log)
            if match:
                ip = match.group('ip')
                status_code = match.group('status_code')
                timestamp = int(time.time())  # Using current timestamp for the event
                action = f'http_error_{status_code}'
                port = 80  # Default to HTTP port 80
                extra_info = f"Status Code: {status_code}"

                # Insert the log into the database
                insert_security_log(ip, action, timestamp, port, extra_info)
                logging.info("Inserted HTTP error log: %s, %s, %s", ip, status_code, extra_info)
                parsed_events.append({'ip': ip, 'action': action, 'timestamp': timestamp, 'port': port, 'extra_info': extra_info}) # add parsed event


        return parsed_events # return list of parsed events


    except FileNotFoundError as e:
        logging.error("Zoraxy log file not found: %s", e)
        return [] # return empty list in case of file not found
    except Exception as e:
        logging.error("Error processing Zoraxy logs: %s", e)
        return [] # return empty list in case of other errors

# Function to run these processes periodically
def run_periodic_log_capture():
    while True:
        process_lastb_logs()  # Process lastb logs
        process_zoraxy_logs()  # Process Zoraxy logs
        process_auth_logs() # Process auth logs
        process_firewall_logs() # Process firewall logs
        # Sleep for 60 seconds before running again
        time.sleep(60)

# rtad_manager.py


# Function to fetch attack events
def get_attack_events():
    return aggregate_attack_events()

# Function to aggregate attack events from different log sources
def aggregate_attack_events():
    try:
        all_events = []
        # Call each log processing function and extend the all_events list
        all_events.extend(process_lastb_logs())
        all_events.extend(process_zoraxy_logs())
        all_events.extend(process_auth_logs()) # Placeholder function for auth.log
        all_events.extend(process_firewall_logs()) # Placeholder function for firewall logs
        return all_events
    except Exception as e:
        # Log any errors
        app.logger.error(f"Error fetching attack events: {str(e)}")
        return None

# Function to parse auth.log for security events
def process_auth_logs():
    log_file_path = '/var/log/auth.log'  # Path to auth.log (Debian/Ubuntu)
    parsed_events = []
    try:
        with open(log_file_path, 'r') as log_file:
            logs = log_file.readlines()

        # Regex for failed SSH login attempts in auth.log (adjust as needed)
        # Example log line:
        # Feb 15 14:30:01 myhost sshd[12345]: Failed password for invalid user test from 192.168.1.100 port 22 ssh2
        failed_ssh_pattern = re.compile(
            r'(?P<timestamp>\w+ \d+ \d+:\d+:\d+) .* sshd\[\d+\]: Failed password for(?: invalid user)? .* from (?P<ip>\d+\.\d+\.\d+\.\d+) port (?P<port>\d+) ssh2'
        )

        for log in logs:
            match = failed_ssh_pattern.search(log)
            if match:
                timestamp_str = match.group('timestamp')
                # Convert timestamp string to Unix timestamp (adjust format if needed)
                try:
                    timestamp_datetime = datetime.strptime(timestamp_str, "%b %d %H:%M:%S")
                    # Need to make the year explicit, current year is assumed. Potential issue at year change.
                    timestamp = int(time.mktime(timestamp_datetime.timetuple()))
                except ValueError:
                    logging.warning(f"Could not parse timestamp: {timestamp_str} in log line: {log.strip()}")
                    timestamp = int(time.time()) # Fallback to current timestamp if parsing fails

                ip = match.group('ip')
                port = match.group('port')
                action = 'failed_login_ssh' # More specific action
                extra_info = f"Auth.log - Failed SSH login attempt"

                insert_security_log(ip, action, timestamp, port, extra_info)
                logging.info("Inserted auth.log event: %s, %s, %s", ip, action, extra_info)
                parsed_events.append({'ip': ip, 'action': action, 'timestamp': timestamp, 'port': port, 'extra_info': extra_info}) # add parsed event

        return parsed_events

    except FileNotFoundError:
        logging.warning(f"Auth log file not found: {log_file_path}")
        return [] # return empty list if file not found
    except Exception as e:
        logging.error(f"Error processing auth logs: {e}")
        return [] # Return empty list in case of errors

# Function to process iptables firewall logs
def process_firewall_logs():
    log_file_path = '/var/log/kern.log'  # Or /var/log/messages, check your system
    parsed_events = []
    try:
        with open(log_file_path, 'r') as log_file:
            logs = log_file.readlines()

        # Basic regex for iptables LOG messages (adjust prefix if needed)
        iptables_pattern = re.compile(
            r'IPTABLES.*SRC=(?P<src_ip>\d+\.\d+\.\d+\.\d+).*DST=(?P<dst_ip>\d+\.\d+\.\d+\.\d+).*SPT=(?P<src_port>\d+).*DPT=(?P<dst_port>\d+)'
        )

        for log in logs:
            if "IPTABLES" in log: # Quick filter to improve performance
                match = iptables_pattern.search(log)
                if match:
                    timestamp = int(time.time()) # Firewall logs in kern.log already have timestamp, but parsing it is more complex for now. Using current timestamp for simplicity.
                    ip = match.group('src_ip') # Source IP is usually the attacker in DROP rules
                    src_port = match.group('src_port')
                    dst_port = match.group('dst_port')

                    action = 'firewall_drop' # Assuming we are logging DROP rules
                    extra_info = f"IPTABLES DROP: SRC:{ip}:{src_port} DST:{match.group('dst_ip')}:{dst_port}"
                    port = dst_port # Destination port might be relevant

                    insert_security_log(ip, action, timestamp, port, extra_info)
                    logging.info("Inserted firewall event: %s, %s, %s", ip, action, extra_info)
                    parsed_events.append({
                        'ip': ip,
                        'action': action,
                        'timestamp': timestamp,
                        'port': port,
                        'extra_info': extra_info
                    })
        return parsed_events

    except FileNotFoundError:
        logging.warning(f"Firewall log file not found: {log_file_path}")
        return [] # Return empty list if file not found
    except Exception as e:
        logging.error(f"Error processing firewall logs: {e}")
        return [] # Return empty list in case of errors


# Function to fetch the security summary (example)
def get_security_summary():
    try:
        # Implement logic to generate a summary of the security events
        summary = calculate_security_summary()  # Replace with your actual summary logic
        return summary
    except Exception as e:
        app.logger.error(f"Error fetching security summary: {str(e)}")
        return None


if __name__ == "__main__":
    logging.info("Starting background process for capturing logs")
    run_periodic_log_capture()
