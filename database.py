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

    # Create table for country centroids
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS country_centroids (
            country_code TEXT PRIMARY KEY,
            lat REAL,
            lon REAL
        )
    """)

    # Insert statements for country centroids (no placeholders, single multi-value insert).
    # Extend as needed for more countries. 'INSERT OR IGNORE' ensures no duplicates if table already populated.
    cursor.execute("""
        INSERT OR IGNORE INTO country_centroids (country_code, lat, lon)
        VALUES
        ('US', 37.0902, -95.7129),
        ('CN', 35.8617, 104.1954),
        ('NL', 52.1326, 5.2913),
        ('GB', 55.3781, -3.4360),
        ('DE', 51.1657, 10.4515),
        ('FR', 46.2276, 2.2137),
        ('RU', 61.5240, 105.3188),
        ('CA', 56.1304, -106.3468),
        ('BR', -14.2350, -51.9253),
        ('AU', -25.2744, 133.7751),
        ('JP', 36.2048, 138.2529),
        ('IN', 20.5937, 78.9629),
        ('SG', 1.3521, 103.8198),
        ('KR', 35.9078, 127.7669),
        ('ZA', -30.5595, 22.9375),
        ('SE', 60.1282, 18.6435),
        ('CH', 46.8182, 8.2275),
        ('AT', 47.5162, 14.5501),
        ('BE', 50.5039, 4.4699),
        ('DK', 56.2639, 9.5018)
    """)

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

def get_country_centroid(country_code):
    """
    Returns (lat, lon) for the given country_code from the country_centroids table.
    If the country is not in the table, returns (None, None).
    """
    if not country_code or country_code == "Unknown":
        return (None, None)
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute(
        "SELECT lat, lon FROM country_centroids WHERE country_code = ?",
        (country_code.upper(),)
    ).fetchone()
    conn.close()
    if row:
        return (row["lat"], row["lon"])
    return (None, None)
