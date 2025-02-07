from flask import Flask, render_template, jsonify, request
import psutil
import docker
from datetime import datetime
import time
import threading
import logging
import sqlite3
import subprocess

# Uncomment for debugging in the console:
# logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
client = docker.from_env()

def get_db_connection():
    conn = sqlite3.connect("stats.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS cpu_history (timestamp REAL, usage REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS cpu_history_24h (timestamp REAL, usage REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS memory_history (timestamp REAL, free REAL, used REAL, cached REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS memory_history_24h (timestamp REAL, usage REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS disk_history_basic (timestamp REAL, total REAL, used REAL, free REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS disk_history_details (timestamp REAL, used REAL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS net_history (interface TEXT, timestamp REAL, input REAL, output REAL)")
    # Updated network_settings table with display_name field:
    cursor.execute("CREATE TABLE IF NOT EXISTS network_settings (interface TEXT PRIMARY KEY, display_order INTEGER, visible INTEGER, display_name TEXT)")
    # New tables for veth mappings:
    cursor.execute("CREATE TABLE IF NOT EXISTS docker_veth_mapping (veth_interface TEXT PRIMARY KEY, container_name TEXT)")
    cursor.execute("CREATE TABLE IF NOT EXISTS veth_network_names (veth_interface TEXT PRIMARY KEY, docker_network_name TEXT)")
    conn.commit()
    conn.close()

MAX_HISTORY = 30

def load_history():
    """
    Load previously stored history data from the SQLite database into the global in-memory arrays.
    """
    global cpu_history, memory_history_basic, disk_history_basic
    global cpu_history_24h, memory_history_24h, disk_history
    global network_history

    conn = get_db_connection()
    cursor = conn.cursor()

    # CPU basic (cpugr1)
    cursor.execute("SELECT timestamp, usage FROM cpu_history ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY,))
    rows = cursor.fetchall()[::-1]
    cpu_history.clear()
    cpu_history['time'] = [datetime.fromtimestamp(r['timestamp']).strftime('%H:%M:%S') for r in rows]
    cpu_history['usage'] = [r['usage'] for r in rows]

    # Memory basic (memgr1)
    cursor.execute("SELECT timestamp, free, used, cached FROM memory_history ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY,))
    rows = cursor.fetchall()[::-1]
    memory_history_basic.clear()
    memory_history_basic['time'] = [datetime.fromtimestamp(r['timestamp']).strftime('%H:%M:%S') for r in rows]
    memory_history_basic['free'] = [r['free'] for r in rows]
    memory_history_basic['used'] = [r['used'] for r in rows]
    memory_history_basic['cached'] = [r['cached'] for r in rows]

    # Disk basic (diskgr1)
    cursor.execute("SELECT timestamp, total, used, free FROM disk_history_basic ORDER BY timestamp DESC LIMIT ?", (MAX_HISTORY,))
    rows = cursor.fetchall()[::-1]
    disk_history_basic.clear()
    disk_history_basic['time'] = [datetime.fromtimestamp(r['timestamp']).strftime('%H:%M:%S') for r in rows]
    disk_history_basic['total'] = [r['total'] for r in rows]
    disk_history_basic['used'] = [r['used'] for r in rows]
    disk_history_basic['free'] = [r['free'] for r in rows]

    # CPU extended (cpugr2) => 24h aggregated
    cursor.execute("SELECT timestamp, usage FROM cpu_history_24h ORDER BY timestamp ASC")
    rows = cursor.fetchall()
    all_cpu_24h = [{'time': r['timestamp'], 'usage': r['usage']} for r in rows]
    if len(all_cpu_24h) > MAX_HISTORY:
        all_cpu_24h = all_cpu_24h[-MAX_HISTORY:]
    cpu_history_24h[:] = all_cpu_24h

    # Memory extended (memgr2) => 24h aggregated
    cursor.execute("SELECT timestamp, usage FROM memory_history_24h ORDER BY timestamp ASC")
    rows = cursor.fetchall()
    all_mem_24h = [{'time': r['timestamp'], 'usage': r['usage']} for r in rows]
    if len(all_mem_24h) > MAX_HISTORY:
        all_mem_24h = all_mem_24h[-MAX_HISTORY:]
    memory_history_24h[:] = all_mem_24h

    # Disk extended (diskgr2) => 7 days aggregated (max usage every 4 hours)
    cursor.execute("SELECT timestamp, used FROM disk_history_details ORDER BY timestamp ASC")
    rows = cursor.fetchall()
    all_disk = [{'time': r['timestamp'], 'used': r['used']} for r in rows]
    if len(all_disk) > MAX_HISTORY:
        all_disk = all_disk[-MAX_HISTORY:]
    disk_history[:] = all_disk

    # Network
    cursor.execute("SELECT interface, timestamp, input, output FROM net_history ORDER BY timestamp ASC")
    rows = cursor.fetchall()
    network_history.clear()
    for row in rows:
        iface = row['interface']
        if iface not in network_history:
            network_history[iface] = []
        network_history[iface].append({
            'time': datetime.fromtimestamp(row['timestamp']).strftime('%H:%M:%S'),
            'input': row['input'],
            'output': row['output']
        })
        if len(network_history[iface]) > MAX_HISTORY:
            network_history[iface] = network_history[iface][-MAX_HISTORY:]

    conn.close()

# Global caches
cached_stats = {
    'system': {},
    'docker': [],
    'network': {'interfaces': {}}
}

cpu_history = {'time': [], 'usage': []}
memory_history_basic = {'time': [], 'free': [], 'used': [], 'cached': []}
disk_history_basic = {'time': [], 'total': [], 'used': [], 'free': []}
cpu_history_24h = []
memory_history_24h = []
disk_history = []
network_history = {}

# Aggregators for the extended views:
#  - CPU & Memory: average usage per hour, keep last 24h
#  - Disk: maximum usage every 4 hours, keep last 7 days
cpu_24h_aggregator = {
    'current_hour': None,
    'sum': 0.0,
    'count': 0
}
mem_24h_aggregator = {
    'current_hour': None,
    'sum': 0.0,
    'count': 0
}
disk_7d_aggregator = {
    'current_4hour': None,
    'max': 0.0
}

updating_containers = {}
image_update_info = {}

def parse_docker_created(created_str):
    if created_str.endswith('Z'):
        created_str = created_str[:-1]
    if '.' in created_str:
        base, frac = created_str.split('.', 1)
        frac = frac[:6]
        created_str = base + '.' + frac
        fmt = '%Y-%m-%dT%H:%M:%S.%f'
    else:
        fmt = '%Y-%m-%dT%H:%M:%S'
    try:
        return datetime.strptime(created_str, fmt)
    except:
        return datetime.now()

def get_docker_info():
    """
    Returns a list of container info.
    If a container is in updating_containers but not in the real Docker list, we create a "virtual" container object.
    Also, if it *is* found, we override the status with the current "phase" if in progress.
    """
    containers = []
    real_containers = {c.name: c for c in client.containers.list(all=True)}

    for cname, container in real_containers.items():
        try:
            created = container.attrs.get('Created', '')
            dt_created = parse_docker_created(created) if created else datetime.now()
            uptime = int(time.time() - dt_created.timestamp())
        except Exception:
            uptime = 0

        if container.image.tags:
            display_image = container.image.tags[0]
            used_image = display_image
            is_up_to_date = image_update_info.get(cname, True)
        elif "RepoDigests" in container.image.attrs and container.image.attrs["RepoDigests"]:
            repo_digest = container.image.attrs["RepoDigests"][0]
            repo_name = repo_digest.split("@")[0]
            used_image = repo_name + ":latest"
            display_image = repo_name
            is_up_to_date = image_update_info.get(cname, True)
        else:
            display_image = "untagged"
            used_image = "untagged"
            is_up_to_date = False

        status_str = container.status
        if cname in updating_containers:
            ud = updating_containers[cname]
            if ud["in_progress"]:
                status_str = f"Updating ({ud.get('phase','')})"
            elif ud["error"]:
                status_str = f"Update failed: {ud['error']}"
            elif ud["success"]:
                status_str = "Update success"

        containers.append({
            'name': cname,
            'status': status_str,
            'image': display_image,
            'used_image': used_image,
            'created': container.attrs.get('Created', ''),
            'uptime': uptime,
            'up_to_date': is_up_to_date
        })

    for cname, ud in updating_containers.items():
        if cname not in real_containers:
            phase_str = ud.get("phase", "Updating")
            status_str = f"Updating ({phase_str})"
            if ud["error"]:
                status_str = f"Update failed: {ud['error']}"
            elif ud["success"]:
                status_str = "Update success"
            containers.append({
                'name': cname,
                'status': status_str,
                'image': "(updating...)",
                'used_image': "(updating...)",
                'created': "",
                'uptime': 0,
                'up_to_date': False
            })

    return containers

prev_net_io = None
prev_net_time = None

def get_cpu_details():
    try:
        load15 = psutil.getloadavg()[2]
    except:
        load15 = 0
    return {'load15': load15}

def get_memory_details():
    return {}

def get_disk_details():
    """
    Return immediate disk info (for current usage),
    plus the in-memory 'disk_history' which is loaded on startup.
    """
    disk = psutil.disk_usage('/')
    history = [{
        'time': datetime.fromtimestamp(entry['time']).strftime('%D-%H:%M'),
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
    """
    Update the hourly/4-hour aggregators for CPU, Memory, Disk.
    Inserts aggregated data and deletes old entries beyond specified retention.
    """

    now = int(time.time())

    # --- CPU aggregator (1-hour) ---
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
            avg_usage = (cpu_24h_aggregator['sum'] /
                         cpu_24h_aggregator['count']) if cpu_24h_aggregator['count'] else 0
            cursor.execute("INSERT INTO cpu_history_24h (timestamp, usage) VALUES (?, ?)",
                           (float(cpu_24h_aggregator['current_hour']), avg_usage))
            cutoff = time.time() - 86400
            cursor.execute("DELETE FROM cpu_history_24h WHERE timestamp < ?", (cutoff,))

            cpu_24h_aggregator['current_hour'] = current_hour
            cpu_24h_aggregator['sum'] = cpu_percent
            cpu_24h_aggregator['count'] = 1

    # --- Memory aggregator (1-hour) ---
    if mem_24h_aggregator['current_hour'] is None:
        mem_24h_aggregator['current_hour'] = current_hour
        mem_24h_aggregator['sum'] = mem_used_gb
        mem_24h_aggregator['count'] = 1
    else:
        if current_hour == mem_24h_aggregator['current_hour']:
            mem_24h_aggregator['sum'] += mem_used_gb
            mem_24h_aggregator['count'] += 1
        else:
            avg_mem_usage = (mem_24h_aggregator['sum'] /
                             mem_24h_aggregator['count']) if mem_24h_aggregator['count'] else 0
            cursor.execute("INSERT INTO memory_history_24h (timestamp, usage) VALUES (?, ?)",
                           (float(mem_24h_aggregator['current_hour']), avg_mem_usage))
            cutoff = time.time() - 86400
            cursor.execute("DELETE FROM memory_history_24h WHERE timestamp < ?", (cutoff,))

            mem_24h_aggregator['current_hour'] = current_hour
            mem_24h_aggregator['sum'] = mem_used_gb
            mem_24h_aggregator['count'] = 1

    # --- Disk aggregator (4-hour) ---
    current_4hour = now // 14400  # 14400 = 4h in seconds
    if disk_7d_aggregator['current_4hour'] is None:
        disk_7d_aggregator['current_4hour'] = current_4hour
        disk_7d_aggregator['max'] = disk_used
    else:
        if current_4hour == disk_7d_aggregator['current_4hour']:
            if disk_used > disk_7d_aggregator['max']:
                disk_7d_aggregator['max'] = disk_used
        else:
            old_4h_timestamp = float(disk_7d_aggregator['current_4hour'] * 14400)
            cursor.execute("INSERT INTO disk_history_details (timestamp, used) VALUES (?, ?)",
                           (old_4h_timestamp, disk_7d_aggregator['max']))
            cutoff_7d = time.time() - (7 * 24 * 3600)
            cursor.execute("DELETE FROM disk_history_details WHERE timestamp < ?", (cutoff_7d,))

            disk_7d_aggregator['current_4hour'] = current_4hour
            disk_7d_aggregator['max'] = disk_used

last_network_update = 0
# Change here to update Net stats every 1 second
NETWORK_UPDATE_INTERVAL = 1.0  # seconds

def update_stats_cache():
    global cached_stats, cpu_history, memory_history_basic, disk_history_basic
    global prev_net_io, prev_net_time, network_history
    global last_network_update

    conn = get_db_connection()
    cursor = conn.cursor()

    while True:
        try:
            now = time.time()
            now_str = datetime.now().strftime('%H:%M:%S')

            cpu_percent = psutil.cpu_percent()
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            # CPU short (cpugr1)
            cpu_history['time'].append(now_str)
            cpu_history['usage'].append(cpu_percent)
            if len(cpu_history['time']) > MAX_HISTORY:
                cpu_history['time'].pop(0)
                cpu_history['usage'].pop(0)
            cursor.execute(
                "INSERT INTO cpu_history (timestamp, usage) VALUES (?, ?)",
                (now, cpu_percent)
            )
            cursor.execute(
                """DELETE FROM cpu_history
                   WHERE rowid NOT IN (
                     SELECT rowid FROM cpu_history
                     ORDER BY timestamp DESC
                     LIMIT ?
                   )
                """, (MAX_HISTORY,)
            )

            # Memory short (memgr1)
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
            cursor.execute(
                "INSERT INTO memory_history (timestamp, free, used, cached) VALUES (?, ?, ?, ?)",
                (now,
                 round(mem.free/(1024**3), 2),
                 round(used_no_cache_GB, 2),
                 round(cached_GB, 2))
            )
            cursor.execute(
                """DELETE FROM memory_history
                   WHERE rowid NOT IN (
                     SELECT rowid FROM memory_history
                     ORDER BY timestamp DESC
                     LIMIT ?
                   )""", (MAX_HISTORY,)
            )

            # Disk short (diskgr1)
            total_disk_GB = round(disk.total / (1024 ** 3), 2)
            used_disk_GB = round(disk.used / (1024 ** 3), 2)
            free_disk_GB = round(disk.free / (1024 ** 3), 2)
            disk_history_basic['time'].append(now_str)
            disk_history_basic['total'].append(total_disk_GB)
            disk_history_basic['used'].append(used_disk_GB)
            disk_history_basic['free'].append(free_disk_GB)
            if len(disk_history_basic['time']) > MAX_HISTORY:
                disk_history_basic['time'].pop(0)
                disk_history_basic['total'].pop(0)
                disk_history_basic['used'].pop(0)
                disk_history_basic['free'].pop(0)
            cursor.execute(
                "INSERT INTO disk_history_basic (timestamp, total, used, free) VALUES (?, ?, ?, ?)",
                (now, total_disk_GB, used_disk_GB, free_disk_GB)
            )
            cursor.execute(
                """DELETE FROM disk_history_basic
                   WHERE rowid NOT IN (
                     SELECT rowid FROM disk_history_basic
                     ORDER BY timestamp DESC
                     LIMIT ?
                   )""", (MAX_HISTORY,)
            )

            # Extended aggregators (CPU, Mem, Disk)
            mem_used_gb = round(mem.used / (1024 ** 3), 2)
            update_aggregators(cursor, cpu_percent, mem_used_gb, disk.used)

            # Format extended CPU & Memory for UI
            cpu_24h_formatted = [
                {
                    'time': datetime.fromtimestamp(e['time']).strftime('%H:%M'),
                    'usage': e['usage']
                }
                for e in cpu_history_24h
            ]
            mem_24h_formatted = [
                {
                    'time': datetime.fromtimestamp(e['time']).strftime('%H:%M'),
                    'usage': e['usage']
                }
                for e in memory_history_24h
            ]

            heavy_cpu_details = get_cpu_details()
            heavy_cpu_details['history24h'] = cpu_24h_formatted
            heavy_mem_details = get_memory_details()
            heavy_mem_details['history24h'] = mem_24h_formatted

            # Disk extended details (cached in memory)
            cached_disk_details = get_disk_details()

            # Update network stats every 1 second now
            if (now - last_network_update) >= NETWORK_UPDATE_INTERVAL:
                net_current = psutil.net_io_counters(pernic=True)
                if prev_net_io is not None and prev_net_time is not None:
                    dt = now - prev_net_time
                    if dt > 0:
                        for iface, stats in net_current.items():
                            prev_stats = prev_net_io.get(iface)
                            if prev_stats:
                                input_speed = (stats.bytes_recv - prev_stats.bytes_recv)/(dt*(1024*1024))
                                output_speed = (stats.bytes_sent - prev_stats.bytes_sent)/(dt*(1024*1024))
                                if input_speed < 0.0001:
                                    input_speed = 0
                                if output_speed < 0.0001:
                                    output_speed = 0
                                if iface not in network_history:
                                    network_history[iface] = []
                                network_history[iface].append({
                                    'time': datetime.fromtimestamp(now).strftime('%H:%M:%S'),
                                    'input': input_speed,
                                    'output': output_speed
                                })
                                if len(network_history[iface]) > MAX_HISTORY:
                                    network_history[iface] = network_history[iface][-MAX_HISTORY:]
                                cursor.execute(
                                    "INSERT INTO net_history (interface, timestamp, input, output) VALUES (?, ?, ?, ?)",
                                    (iface, now, input_speed, output_speed)
                                )
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

            # Build final system stats
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

            # The "network" portion references our in-memory data
            cached_stats['network'] = {'interfaces': network_history}

        except Exception as e:
            logging.error("Error updating cache: %s", e)

        conn.commit()
        time.sleep(0.5)

def docker_info_updater():
    """
    Runs in its own thread, updates the 'cached_stats["docker"]' every N seconds
    to reduce overhead from frequent calls to `get_docker_info()`.
    """
    UPDATE_INTERVAL = 5  # seconds
    while True:
        try:
            docker_data = get_docker_info()
            cached_stats['docker'] = docker_data
        except Exception as e:
            logging.error("Error in docker_info_updater: %s", e)
        time.sleep(UPDATE_INTERVAL)

def check_image_updates():
    global image_update_info
    while True:
        try:
            for container in client.containers.list(all=True):
                if container.image.tags:
                    image_tag = container.image.tags[0]
                else:
                    repo_digest = container.image.attrs.get("RepoDigests", [])
                    if repo_digest:
                        repo_name = repo_digest[0].split("@")[0]
                        image_tag = repo_name + ":latest"
                    else:
                        continue
                try:
                    latest_img = client.images.pull(image_tag)
                except Exception as e:
                    logging.error("Error pulling %s: %s", image_tag, e)
                    continue
                image_update_info[container.name] = (container.image.id == latest_img.id)
        except Exception as e:
            logging.error("Error checking image updates: %s", e)
        time.sleep(60)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stats')
def stats():
    return jsonify(cached_stats)

update_status = {}

@app.route('/update/<container_name>', methods=['POST'])
def update_container(container_name):
    """
    Initiates an update for the specified container.
    We forcibly keep it in 'updating_containers' so it doesn't vanish from the table if removed.
    """
    global updating_containers, image_update_info

    if container_name in updating_containers:
        del updating_containers[container_name]
    if container_name in update_status:
        del update_status[container_name]

    updating_containers[container_name] = {
        "phase": "pulling new image...",
        "new_image_id": None,
        "in_progress": True,
        "error": None,
        "success": False
    }
    update_status[container_name] = {
        "in_progress": True,
        "success": False,
        "error": None,
        "phase": "pulling new image..."
    }

    def do_update(cname):
        try:
            try:
                old_container = client.containers.get(cname)
            except docker.errors.NotFound:
                old_container = None

            time.sleep(2)
            updating_containers[cname]["phase"] = "pulling new image..."
            update_status[cname]["phase"] = "pulling new image..."

            if old_container and old_container.image.tags:
                image_tag = old_container.image.tags[0]
            else:
                if old_container and old_container.image.attrs.get("RepoDigests"):
                    repo_digest = old_container.image.attrs["RepoDigests"][0]
                    repo_name = repo_digest.split("@")[0]
                    image_tag = repo_name + ":latest"
                else:
                    msg = "No valid image tag/digest found"
                    updating_containers[cname]["error"] = msg
                    updating_containers[cname]["in_progress"] = False
                    update_status[cname]["error"] = msg
                    update_status[cname]["in_progress"] = False
                    return
            fresh_img = None
            try:
                fresh_img = client.images.pull(image_tag)
            except Exception as e:
                msg = f"Error pulling {image_tag}: {str(e)}"
                logging.error(msg)
                updating_containers[cname]["error"] = msg
                updating_containers[cname]["in_progress"] = False
                update_status[cname]["error"] = msg
                update_status[cname]["in_progress"] = False
                return
            if fresh_img:
                updating_containers[cname]["new_image_id"] = fresh_img.id

            # 2) Stop container
            updating_containers[cname]["phase"] = "stopping..."
            update_status[cname]["phase"] = "stopping..."
            time.sleep(2)
            if old_container:
                try:
                    old_container.stop(timeout=10)
                except Exception as e:
                    logging.error(f"Error stopping container {cname}: {e}")

            # 3) Remove container
            updating_containers[cname]["phase"] = "removing old container..."
            update_status[cname]["phase"] = "removing old container..."
            time.sleep(2)
            if old_container:
                try:
                    old_container.remove()
                except Exception as e:
                    logging.error(f"Error removing container {cname}: {e}")
                if image_tag:
                    try:
                        client.images.remove(image=image_tag, force=True)
                    except Exception as e:
                        logging.error(f"Error removing old image {image_tag}: {e}")

            # 4) Start container
            updating_containers[cname]["phase"] = "starting..."
            update_status[cname]["phase"] = "starting..."
            time.sleep(2)
            config = old_container.attrs.get('Config', {}) if old_container else {}
            host_config = old_container.attrs.get('HostConfig', {}) if old_container else {}
            cmd = config.get('Cmd')
            env = config.get('Env')
            ports = host_config.get('PortBindings')
            volumes_config = config.get('Volumes', {})
            volumes = list(volumes_config.keys()) if volumes_config else None
            if volumes:
                volumes = [
                    v for v in volumes
                    if v not in ['/var/run/docker.sock', '/run/docker.sock']
                ]
                if len(volumes) == 0:
                    volumes = None

            new_container = client.containers.run(
                image=image_tag,
                name=cname,
                command=cmd,
                environment=env,
                ports=ports,
                volumes=volumes,
                detach=True
            )

            # 5) Wait up to 5 minutes
            waited = 0
            interval = 5
            max_wait = 300
            while waited < max_wait:
                new_container.reload()
                health_status = new_container.attrs.get("State", {}).get("Health", {}).get("Status")
                if health_status == "healthy" or (health_status is None and new_container.status.lower() == "running"):
                    updating_containers[cname]["success"] = True
                    update_status[cname]["success"] = True
                    break
                time.sleep(interval)
                waited += interval

            if not updating_containers[cname]["success"]:
                err_msg = "Container did not become healthy within 5 minutes."
                logging.error(err_msg)
                updating_containers[cname]["error"] = err_msg
                update_status[cname]["error"] = err_msg

        except Exception as e:
            logging.error(f"Error updating container '{cname}': {e}")
            updating_containers[cname]["error"] = str(e)
            update_status[cname]["error"] = str(e)
        finally:
            updating_containers[cname]["in_progress"] = False
            update_status[cname]["in_progress"] = False

            if updating_containers[cname]["success"]:
                try:
                    new_c = client.containers.get(cname)
                    new_image_id = updating_containers[cname].get("new_image_id")
                    if new_c and new_image_id and (new_c.image.id == new_image_id):
                        image_update_info[cname] = True
                except:
                    pass

    threading.Thread(target=do_update, args=(container_name,), daemon=True).start()
    return jsonify({"status": "in_progress"})

@app.route('/update_status/<container_name>')
def get_update_status(container_name):
    st = update_status.get(container_name)
    if not st:
        return jsonify({"in_progress": False, "success": False, "error": None, "phase": ""})
    return jsonify(st)

@app.route('/check/<container_name>', methods=['POST'])
def check_container(container_name):
    """
    Single-container "Check for updates" route.
    """
    def do_check(cname):
        try:
            cont = client.containers.get(cname)
        except Exception as e:
            logging.error(f"Container not found: {e}")
            return
        if cont.image.tags:
            image_tag = cont.image.tags[0]
        else:
            repo_digest = cont.image.attrs.get("RepoDigests", [])
            if repo_digest:
                repo_name = repo_digest[0].split("@")[0]
                image_tag = repo_name + ":latest"
            else:
                logging.error(f"Container '{cname}' has no image tag/digest")
                return
        try:
            latest_img = client.images.pull(image_tag)
            up_to_date = (cont.image.id == latest_img.id)
            image_update_info[cname] = up_to_date
        except Exception as e:
            logging.error(f"Error pulling image {image_tag} for {cname}: {e}")

    threading.Thread(target=do_check, args=(container_name,), daemon=True).start()
    return jsonify({"status": "success"})

check_all_status = {'in_progress': False, 'checked':0, 'total':0}

def background_check_all():
    global check_all_status, image_update_info
    containers = client.containers.list(all=True)
    total = len(containers)
    check_all_status['in_progress'] = True
    check_all_status['checked'] = 0
    check_all_status['total'] = total

    for c in containers:
        cname = c.name
        tag = None
        if c.image.tags:
            tag = c.image.tags[0]
        else:
            repo_digest = c.image.attrs.get("RepoDigests", [])
            if repo_digest:
                repo_name = repo_digest[0].split("@")[0]
                tag = repo_name + ":latest"
        if tag:
            try:
                latest = client.images.pull(tag)
                image_update_info[cname] = (c.image.id == latest.id)
            except Exception as e:
                logging.error(f"Error pulling {tag} for {cname}: {e}")
        check_all_status['checked'] += 1
        time.sleep(0.3)

    check_all_status['in_progress'] = False

@app.route('/check_all', methods=['POST'])
def check_all():
    if check_all_status['in_progress']:
        return jsonify({'status': 'already_in_progress'})
    t = threading.Thread(target=background_check_all, daemon=True)
    t.start()
    return jsonify({'status': 'started'})

@app.route('/check_all_status', methods=['GET'])
def get_all_status():
    return jsonify({
        'in_progress': check_all_status['in_progress'],
        'checked': check_all_status['checked'],
        'total': check_all_status['total']
    })

# --- New endpoints for network settings and veth mappings ---

@app.route('/network_settings', methods=['GET'])
def get_network_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT interface, display_order, visible, display_name FROM network_settings ORDER BY display_order ASC")
    rows = cursor.fetchall()
    settings = []
    for row in rows:
        settings.append({
            "interface": row["interface"],
            "display_order": row["display_order"],
            "visible": bool(row["visible"]),
            "display_name": row["display_name"] if row["display_name"] is not None else row["interface"]
        })
    conn.close()
    return jsonify(settings)

@app.route('/network_settings', methods=['POST'])
def update_network_settings():
    settings = request.json  # expecting a list of settings
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM network_settings")
    for s in settings:
        iface = s.get("interface")
        display_order = s.get("display_order", 0)
        visible = 1 if s.get("visible") else 0
        display_name = s.get("display_name", iface)
        cursor.execute("INSERT INTO network_settings (interface, display_order, visible, display_name) VALUES (?, ?, ?, ?)",
                       (iface, display_order, visible, display_name))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

def update_docker_veth_mapping():
    """
    Checks which docker containers are connected to which veth interfaces on the host.
    Uses a simple heuristic: it iterates over host interfaces (using psutil) filtering those starting with 'veth'
    and checks if the container id (first 12 chars) appears in the interface name.
    Saves the mapping in the docker_veth_mapping table.
    """
    import psutil
    interfaces = psutil.net_if_addrs().keys()
    veth_ifaces = [iface for iface in interfaces if iface.startswith("veth")]
    mapping = {}
    for container in client.containers.list(all=True):
        for iface in veth_ifaces:
            if container.id[:12] in iface:
                mapping[iface] = container.name
                break
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM docker_veth_mapping")
    for iface, cname in mapping.items():
        cursor.execute("INSERT INTO docker_veth_mapping (veth_interface, container_name) VALUES (?, ?)", (iface, cname))
    conn.commit()
    conn.close()

def update_veth_network_names():
    """
    For each veth interface found in docker_veth_mapping, retrieves the docker network name (the key from the container's Networks dict)
    from the container's network settings. Saves this information in the veth_network_names table.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT veth_interface, container_name FROM docker_veth_mapping")
    rows = cursor.fetchall()
    mapping = {}
    for row in rows:
        veth_iface = row["veth_interface"]
        container_name = row["container_name"]
        try:
            container = client.containers.get(container_name)
            networks = container.attrs.get("NetworkSettings", {}).get("Networks", {})
            docker_net_name = next(iter(networks.keys())) if networks else ""
            mapping[veth_iface] = docker_net_name
        except Exception as e:
            mapping[veth_iface] = ""
    cursor.execute("DELETE FROM veth_network_names")
    for iface, netname in mapping.items():
        cursor.execute("INSERT INTO veth_network_names (veth_interface, docker_network_name) VALUES (?, ?)", (iface, netname))
    conn.commit()
    conn.close()

@app.route('/update_veth_info', methods=['POST'])
def update_veth_info():
    update_docker_veth_mapping()
    update_veth_network_names()
    return jsonify({"status": "success"})

@app.route('/get_veth_info', methods=['GET'])
def get_veth_info():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT d.veth_interface, d.container_name, v.docker_network_name FROM docker_veth_mapping d LEFT JOIN veth_network_names v ON d.veth_interface = v.veth_interface")
    rows = cursor.fetchall()
    mappings = []
    for row in rows:
        mappings.append({
            "veth_interface": row["veth_interface"],
            "container_name": row["container_name"],
            "docker_network_name": row["docker_network_name"]
        })
    conn.close()
    return jsonify(mappings)

if __name__ == '__main__':
    initialize_database()
    load_history()

    # Start the stats thread
    threading.Thread(target=update_stats_cache, daemon=True).start()
    # Start the separate Docker-info thread
    threading.Thread(target=docker_info_updater, daemon=True).start()
    # Start the image-update checker (every 60s)
    threading.Thread(target=check_image_updates, daemon=True).start()

    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=True)
