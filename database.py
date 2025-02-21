import sqlite3
from sqlite3 import Row
import time
import os

def get_db_connection():
    conn = sqlite3.connect("stats.db", check_same_thread=False)
    conn.row_factory = Row
    return conn

def initialize_database():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Core Tabellen erstellen
    cursor.execute("CREATE TABLE IF NOT EXISTS cpu_history (timestamp REAL, usage REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS cpu_history_24h (timestamp REAL, usage REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS memory_history (timestamp REAL, free REAL, used REAL, cached REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS memory_history_24h (timestamp REAL, usage REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS disk_history_basic (timestamp REAL, total REAL, used REAL, free REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS disk_history_details (timestamp REAL, used REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS net_history (interface TEXT, timestamp REAL, input REAL, output REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS custom_network_graphs (id INTEGER PRIMARY KEY, graph_name TEXT, interfaces TEXT)")

    # RTAD-bezogene Tabellen (auskommentiert)
    # cursor.execute('''CREATE TABLE IF NOT EXISTS login_attempts (
    #                        id INTEGER PRIMARY KEY AUTOINCREMENT,
    #                        user TEXT,
    #                        ip_address TEXT,
    #                        timestamp REAL,
    #                        failure_reason TEXT
    #                    )''')
    #
    # cursor.execute('''CREATE TABLE IF NOT EXISTS http_error_logs (
    #                        id INTEGER PRIMARY KEY AUTOINCREMENT,
    #                        proxy_type TEXT,
    #                        error_code INTEGER,
    #                        timestamp REAL,
    #                        url TEXT
    #                    )''')

    conn.commit()
    conn.close()



def load_history(cached_data):
    from datetime import datetime
    import psutil

    MAX_HISTORY = 30
    MAX_HISTORY_EXT_CPU = 24
    MAX_HISTORY_EXT_DISK = 28

    conn = get_db_connection()
    cursor = conn.cursor()

    # CPU basic
    cursor.execute("SELECT timestamp, usage FROM cpu_history ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY,))
    rows = cursor.fetchall()[::-1]
    cached_data['cpu_history'].clear()
    cached_data['cpu_history']['time'] = [datetime.fromtimestamp(r['timestamp']).strftime('%H:%M:%S') for r in rows]
    cached_data['cpu_history']['usage'] = [r['usage'] for r in rows]

    # Memory basic
    cursor.execute("SELECT timestamp, free, used, cached FROM memory_history ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY,))
    rows = cursor.fetchall()[::-1]
    cached_data['memory_history_basic'].clear()
    cached_data['memory_history_basic']['time'] = [datetime.fromtimestamp(r['timestamp']).strftime('%H:%M:%S') for r in rows]
    cached_data['memory_history_basic']['free'] = [r['free'] for r in rows]
    cached_data['memory_history_basic']['used'] = [r['used'] for r in rows]
    cached_data['memory_history_basic']['cached'] = [r['cached'] for r in rows]

    # Disk basic
    cursor.execute("SELECT timestamp, total, used, free FROM disk_history_basic ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY,))
    rows = cursor.fetchall()[::-1]
    cached_data['disk_history_basic'].clear()
    cached_data['disk_history_basic']['time'] = [datetime.fromtimestamp(r['timestamp']).strftime('%H:%M:%S') for r in rows]
    cached_data['disk_history_basic']['total'] = [r['total'] for r in rows]
    cached_data['disk_history_basic']['used'] = [r['used'] for r in rows]
    cached_data['disk_history_basic']['free'] = [r['free'] for r in rows]

    # CPU extended
    cursor.execute("SELECT timestamp, usage FROM cpu_history_24h ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY_EXT_CPU,))
    rows = cursor.fetchall()[::-1]
    cached_data['cpu_history_24h'].clear()
    if rows:
        cached_data['cpu_history_24h'].extend([{'time': r['timestamp'], 'usage': r['usage']} for r in rows])
    else:
        current_usage = psutil.cpu_percent()
        cached_data['cpu_history_24h'].append({'time': time.time(), 'usage': current_usage})
    if len(cached_data['cpu_history_24h']) > MAX_HISTORY_EXT_CPU:
        cached_data['cpu_history_24h'] = cached_data['cpu_history_24h'][-MAX_HISTORY_EXT_CPU:]

    # Memory extended
    cursor.execute("SELECT timestamp, usage FROM memory_history_24h ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY_EXT_CPU,))
    rows = cursor.fetchall()[::-1]
    cached_data['memory_history_24h'].clear()
    cached_data['memory_history_24h'].extend([{'time': r['timestamp'], 'usage': r['usage']} for r in rows])
    if len(cached_data['memory_history_24h']) > MAX_HISTORY_EXT_CPU:
        cached_data['memory_history_24h'] = cached_data['memory_history_24h'][-MAX_HISTORY_EXT_CPU:]

    # Disk extended
    cursor.execute("SELECT timestamp, used FROM disk_history_details ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY_EXT_DISK,))
    rows = cursor.fetchall()[::-1]
    cached_data['disk_history'].clear()
    if rows:
        cached_data['disk_history'].extend([{'time': r['timestamp'], 'used': r['used']} for r in rows])
    else:
        disk = psutil.disk_usage('/')
        cached_data['disk_history'].append({'time': time.time(), 'used': disk.used})
    if len(cached_data['disk_history']) > MAX_HISTORY_EXT_DISK:
        cached_data['disk_history'] = cached_data['disk_history'][-MAX_HISTORY_EXT_DISK:]

    # Network basic
    cursor.execute("SELECT interface, timestamp, input, output FROM net_history ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY,))
    rows = cursor.fetchall()
    cached_data['network_history'].clear()
    for row in rows:
        iface = row['interface']
        if iface not in cached_data['network_history']:
            cached_data['network_history'][iface] = []
        cached_data['network_history'][iface].append({
            'time': datetime.fromtimestamp(row['timestamp']).strftime('%H:%M:%S'),
            'input': row['input'],
            'output': row['output']
        })
        if len(cached_data['network_history'][iface]) > MAX_HISTORY:
            cached_data['network_history'][iface] = cached_data['network_history'][iface][-MAX_HISTORY:]
    conn.close()
