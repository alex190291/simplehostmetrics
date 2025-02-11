# simplehostmetrics.refac/stats.py
import time
import threading
import logging
import psutil
import datetime
from database import get_db_connection

MAX_HISTORY = 30
MAX_HISTORY_EXT_CPU = 24   # 24h CPU-Graph
MAX_HISTORY_EXT_DISK = 28  # 7d Disk-Graph (6h-Intervall)
NETWORK_UPDATE_INTERVAL = 1.0  # Sekunden

# Globale Cache-Strukturen für Systemmetriken
cached_stats = {
    'system': {},
    'docker': [],  # Docker-Daten werden von docker_manager aktualisiert
    'network': {'interfaces': {}}
}

cpu_history = {'time': [], 'usage': []}
memory_history_basic = {'time': [], 'free': [], 'used': [], 'cached': []}
disk_history_basic = {'time': [], 'total': [], 'used': [], 'free': []}
cpu_history_24h = []
memory_history_24h = []
disk_history = []
network_history = {}

# Aggregatoren für erweiterte Views
cpu_24h_aggregator = {'current_hour': None, 'sum': 0.0, 'count': 0}
mem_24h_aggregator = {'current_hour': None, 'sum': 0.0, 'count': 0}
# Updated Disk aggregator: now collects sum and count to calculate the average per 6h interval.
disk_7d_aggregator = {'current_6hour': None, 'sum': 0.0, 'count': 0}

prev_net_io = None
prev_net_time = None
last_network_update = 0

def get_cpu_details():
    try:
        load15 = psutil.getloadavg()[2]
    except Exception:
        load15 = 0
    if not cpu_history_24h:
        current_usage = psutil.cpu_percent()
        cpu_history_24h.insert(0, {'time': time.time(), 'usage': current_usage})
    # Format the timestamps for display
    history_formatted = [{
        'time': datetime.datetime.fromtimestamp(e['time']).strftime('%H:%M'),
        'usage': e['usage']
    } for e in cpu_history_24h]
    return {'load15': load15, 'history24h': history_formatted}

def get_memory_details():
    if not memory_history_24h:
        mem = psutil.virtual_memory()
        mem_used_gb = round(mem.used / (1024 ** 3), 2)
        memory_history_24h.insert(0, {'time': time.time(), 'usage': mem_used_gb})
    history_formatted = [{
        'time': datetime.datetime.fromtimestamp(e['time']).strftime('%H:%M'),
        'usage': e['usage']
    } for e in memory_history_24h]
    return {'history24h': history_formatted}

def get_disk_details():
    disk = psutil.disk_usage('/')
    if not disk_history:
        disk_used_gb = round(disk.used / (1024 ** 3), 2)
        disk_history.insert(0, {'time': time.time(), 'used': disk.used})
    history = [{
        'time': datetime.datetime.fromtimestamp(entry['time']).strftime('%m-%d %H:%M'),
        'used': round(entry['used'] / (1024 ** 3), 2)
    } for entry in disk_history]
    return {
        'root': {
            'total': round(disk.total / (1024 ** 3), 2),
            'used': round(disk.used / (1024 ** 3), 2),
            'free': round(disk.free / (1024 ** 3), 2),
            'percent': disk.percent
        },
        'history': history
    }

def update_aggregators(cursor, cpu_percent, mem_used_gb, disk_used):
    now = int(time.time())
    # CPU-Aggregator (1-Stunden)
    current_hour = now - (now % 3600)
    if cpu_24h_aggregator['current_hour'] is None:
        cpu_24h_aggregator['current_hour'] = current_hour
        cpu_24h_aggregator['sum'] = cpu_percent
        cpu_24h_aggregator['count'] = 1
    else:
        if current_hour == cpu_24h_aggregator['current_hour']:
            cpu_24h_aggregator['sum'] += cpu_percent
            cpu_24h_aggregator['count'] += 1
        else:
            avg_usage = (cpu_24h_aggregator['sum'] / cpu_24h_aggregator['count']) if cpu_24h_aggregator['count'] else 0
            cursor.execute("INSERT INTO cpu_history_24h (timestamp, usage) VALUES (?, ?)",
                           (float(cpu_24h_aggregator['current_hour']), avg_usage))
            cutoff = time.time() - (24 * 3600)
            cursor.execute("DELETE FROM cpu_history_24h WHERE timestamp < ?", (cutoff,))
            cpu_24h_aggregator['current_hour'] = current_hour
            cpu_24h_aggregator['sum'] = cpu_percent
            cpu_24h_aggregator['count'] = 1

    # Memory-Aggregator (1-Stunden)
    if mem_24h_aggregator['current_hour'] is None:
        mem_24h_aggregator['current_hour'] = current_hour
        mem_24h_aggregator['sum'] = mem_used_gb
        mem_24h_aggregator['count'] = 1
    else:
        if current_hour == mem_24h_aggregator['current_hour']:
            mem_24h_aggregator['sum'] += mem_used_gb
            mem_24h_aggregator['count'] += 1
        else:
            avg_mem_usage = (mem_24h_aggregator['sum'] / mem_24h_aggregator['count']) if mem_24h_aggregator['count'] else 0
            cursor.execute("INSERT INTO memory_history_24h (timestamp, usage) VALUES (?, ?)",
                           (float(mem_24h_aggregator['current_hour']), avg_mem_usage))
            cutoff = time.time() - (24 * 3600)
            cursor.execute("DELETE FROM memory_history_24h WHERE timestamp < ?", (cutoff,))
            mem_24h_aggregator['current_hour'] = current_hour
            mem_24h_aggregator['sum'] = mem_used_gb
            mem_24h_aggregator['count'] = 1

    # Disk-Aggregator (6-Stunden) using average instead of max
    current_6hour = now // 21600  # 21600 Sekunden = 6h
    if disk_7d_aggregator['current_6hour'] is None:
        disk_7d_aggregator['current_6hour'] = current_6hour
        disk_7d_aggregator['sum'] = disk_used
        disk_7d_aggregator['count'] = 1
    else:
        if current_6hour == disk_7d_aggregator['current_6hour']:
            disk_7d_aggregator['sum'] += disk_used
            disk_7d_aggregator['count'] += 1
        else:
            avg_used = disk_7d_aggregator['sum'] / disk_7d_aggregator['count'] if disk_7d_aggregator['count'] > 0 else disk_used
            old_6h_timestamp = float(disk_7d_aggregator['current_6hour'] * 21600)
            cursor.execute("INSERT INTO disk_history_details (timestamp, used) VALUES (?, ?)",
                           (old_6h_timestamp, avg_used))
            cutoff_7d = time.time() - (7 * 24 * 3600)
            cursor.execute("DELETE FROM disk_history_details WHERE timestamp < ?", (cutoff_7d,))
            disk_7d_aggregator['current_6hour'] = current_6hour
            disk_7d_aggregator['sum'] = disk_used
            disk_7d_aggregator['count'] = 1

def update_stats_cache():
    global cached_stats, cpu_history, memory_history_basic, disk_history_basic
    global prev_net_io, prev_net_time, network_history, last_network_update
    conn = get_db_connection()
    cursor = conn.cursor()
    while True:
        try:
            now = time.time()
            now_str = datetime.datetime.now().strftime('%H:%M:%S')
            cpu_percent = psutil.cpu_percent()
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            # CPU short (Sofortwerte)
            cpu_history['time'].append(now_str)
            cpu_history['usage'].append(cpu_percent)
            if len(cpu_history['time']) > MAX_HISTORY:
                cpu_history['time'].pop(0)
                cpu_history['usage'].pop(0)
            cursor.execute("INSERT INTO cpu_history (timestamp, usage) VALUES (?, ?)", (now, cpu_percent))
            cursor.execute(
                """DELETE FROM cpu_history
                   WHERE rowid NOT IN (
                     SELECT rowid FROM cpu_history
                     ORDER BY timestamp DESC
                     LIMIT ?
                   )
                """, (MAX_HISTORY,)
            )

            # Memory short
            cached_val = getattr(mem, 'cached', 0)
            cached_GB = cached_val / (1024 ** 3)
            used_no_cache_GB = (mem.used - cached_val) / (1024 ** 3)
            memory_history_basic['time'].append(now_str)
            memory_history_basic['free'].append(round(mem.free/(1024**3), 2))
            memory_history_basic['used'].append(round(used_no_cache_GB, 2))
            memory_history_basic['cached'].append(round(cached_GB, 2))
            if len(memory_history_basic['time']) > MAX_HISTORY:
                memory_history_basic['time'].pop(0)
                memory_history_basic['free'].pop(0)
                memory_history_basic['used'].pop(0)
                memory_history_basic['cached'].pop(0)
            cursor.execute("INSERT INTO memory_history (timestamp, free, used, cached) VALUES (?, ?, ?, ?)",
                           (now, round(mem.free/(1024**3), 2), round(used_no_cache_GB, 2), round(cached_GB, 2)))
            cursor.execute(
                """DELETE FROM memory_history
                   WHERE rowid NOT IN (
                     SELECT rowid FROM memory_history
                     ORDER BY timestamp DESC
                     LIMIT ?
                   )""", (MAX_HISTORY,)
            )

            # Disk short
            total_disk_GB = round(disk.total/(1024**3), 2)
            used_disk_GB = round(disk.used/(1024**3), 2)
            free_disk_GB = round(disk.free/(1024**3), 2)
            disk_history_basic['time'].append(now_str)
            disk_history_basic['total'].append(total_disk_GB)
            disk_history_basic['used'].append(used_disk_GB)
            disk_history_basic['free'].append(free_disk_GB)
            if len(disk_history_basic['time']) > MAX_HISTORY:
                disk_history_basic['time'].pop(0)
                disk_history_basic['total'].pop(0)
                disk_history_basic['used'].pop(0)
                disk_history_basic['free'].pop(0)
            cursor.execute("INSERT INTO disk_history_basic (timestamp, total, used, free) VALUES (?, ?, ?, ?)",
                           (now, total_disk_GB, used_disk_GB, free_disk_GB))
            cursor.execute(
                """DELETE FROM disk_history_basic
                   WHERE rowid NOT IN (
                     SELECT rowid FROM disk_history_basic
                     ORDER BY timestamp DESC
                     LIMIT ?
                   )""", (MAX_HISTORY,)
            )

            # Extended aggregatoren (CPU, Memory, Disk)
            mem_used_gb = round(mem.used/(1024**3), 2)
            update_aggregators(cursor, cpu_percent, mem_used_gb, disk.used)

            # Formatierung für UI (24h-Daten)
            cpu_24h_formatted = [{
                'time': datetime.datetime.fromtimestamp(e['time']).strftime('%H:%M'),
                'usage': e['usage']
            } for e in cpu_history_24h]
            mem_24h_formatted = [{
                'time': datetime.datetime.fromtimestamp(e['time']).strftime('%H:%M'),
                'usage': e['usage']
            } for e in memory_history_24h]

            heavy_cpu_details = get_cpu_details()
            heavy_cpu_details['history24h'] = cpu_24h_formatted
            heavy_mem_details = get_memory_details()
            heavy_mem_details['history24h'] = mem_24h_formatted

            cached_disk_details = get_disk_details()

            # Netzwerk-Statistiken (basic graph)
            if (now - last_network_update) >= NETWORK_UPDATE_INTERVAL:
                net_current = psutil.net_io_counters(pernic=True)
                if prev_net_io is not None and prev_net_time is not None:
                    dt = now - prev_net_time
                    if dt > 0:
                        for iface, stats_net in net_current.items():
                            prev_stats = prev_net_io.get(iface)
                            if prev_stats:
                                input_speed = (stats_net.bytes_recv - prev_stats.bytes_recv) / (dt * (1024 * 1024))
                                output_speed = (stats_net.bytes_sent - prev_stats.bytes_sent) / (dt * (1024 * 1024))
                                if input_speed < 0.0001:
                                    input_speed = 0
                                if output_speed < 0.0001:
                                    output_speed = 0
                                if iface not in network_history:
                                    network_history[iface] = []
                                network_history[iface].append({
                                    'time': datetime.datetime.fromtimestamp(now).strftime('%H:%M:%S'),
                                    'input': input_speed,
                                    'output': output_speed
                                })
                                # Trim the in-memory network history for this interface to MAX_HISTORY datapoints
                                if len(network_history[iface]) > MAX_HISTORY:
                                    network_history[iface] = network_history[iface][-MAX_HISTORY:]
                                cursor.execute("INSERT INTO net_history (interface, timestamp, input, output) VALUES (?, ?, ?, ?)",
                                               (iface, now, input_speed, output_speed))
                                cursor.execute(
                                    """DELETE FROM net_history
                                       WHERE rowid NOT IN (
                                         SELECT rowid FROM net_history
                                         WHERE interface=?
                                         ORDER BY timestamp DESC
                                         LIMIT ?
                                       )""", (iface, MAX_HISTORY)
                                )
                prev_net_io = net_current
                prev_net_time = now
                last_network_update = now

            cached_stats['system'] = {
                'cpu': cpu_percent,
                'memory': {
                    'percent': mem.percent,
                    'total': round(mem.total/(1024**3), 2),
                    'used': round(mem.used/(1024**3), 2),
                    'free': round(mem.free/(1024**3), 2),
                    'cached': round(cached_val/(1024**3), 2)
                },
                'disk': {
                    'percent': disk.percent,
                    'total': total_disk_GB,
                    'used': used_disk_GB,
                    'free': free_disk_GB
                },
                'cpu_history': cpu_history,
                'memory_history': memory_history_basic,
                'disk_history_basic': disk_history_basic,
                'cpu_details': heavy_cpu_details,
                'memory_details': heavy_mem_details,
                'disk_details': cached_disk_details
            }
            cached_stats['network'] = {'interfaces': network_history}
        except Exception as e:
            logging.error("Error updating stats cache: %s", e)
        conn.commit()
        time.sleep(0.5)
