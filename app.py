from flask import Flask, render_template, jsonify, request
import psutil
import docker
from datetime import datetime
import time
import threading
import logging

# Uncomment for debugging:
# logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
client = docker.from_env()

# Initialize cached_stats with default values so the dashboard isn’t empty.
cached_stats = {
    'system': {
        'cpu': 0,
        'memory': {
            'percent': 0,
            'total': 0,
            'used': 0,
            'free': 0,
            'cached': 0
        },
        'disk': {
            'percent': 0,
            'total': 0,
            'used': 0,
            'free': 0
        },
        'cpu_history': {'time': [], 'usage': []},
        # For basic views, record memory in GB:
        'memory_history': {'time': [], 'free': [], 'used': [], 'cached': []},
        # For disk basic view (in GiB)
        'disk_history_basic': {'time': [], 'total': [], 'used': [], 'free': []},
        # For extended views:
        'cpu_details': {},
        'memory_details': {},
        'disk_details': {'root': {'total': 0, 'used': 0, 'free': 0}, 'history': []}
    },
    'docker': [],
    'network': {'interfaces': {}}
}

MAX_HISTORY = 30
cpu_history = {'time': [], 'usage': []}  # Short-term CPU history
memory_history_basic = {'time': [], 'free': [], 'used': [], 'cached': []}  # in GB
cpu_history_24h = []         # 24hr CPU history
# For extended memory view, record full used memory (in GB)
memory_history_24h = []      
# Disk basic history (in GiB)
disk_history_basic = {'time': [], 'total': [], 'used': [], 'free': []}
# For extended disk view, record raw disk.used values (will be converted to GB)
disk_history = []

last_cpu_24h_update = 0
last_memory_24h_update = 0
last_disk_update = 0  # Updated every 10 seconds

def get_cpu_details():
    try:
        load15 = psutil.getloadavg()[2]
    except Exception:
        load15 = 0
    return {'load15': load15}

def get_memory_details():
    # Detailed memory info can be added here if needed.
    return {}

def get_disk_details():
    disk = psutil.disk_usage('/')
    now = time.time()
    global disk_history
    disk_history.append({'time': now, 'used': disk.used})
    seven_days_ago = now - 7 * 24 * 3600
    disk_history[:] = [entry for entry in disk_history if entry['time'] >= seven_days_ago]
    history = [
        {
            'time': datetime.fromtimestamp(entry['time']).strftime('%Y-%m-%d %H:%M:%S'),
            # Convert used bytes to GB (2 decimal places)
            'used': round(entry['used'] / (1024 ** 3), 2)
        }
        for entry in disk_history
    ]
    return {
        'root': {
            'total': round(disk.total / (1024 ** 3), 2),
            'used': round(disk.used / (1024 ** 3), 2),
            'free': round(disk.free / (1024 ** 3), 2),
            'percent': disk.percent
        },
        'history': history
    }

cached_heavy = {}
last_heavy_update = 0
last_disk_update = 0
cached_disk_details = {}

image_update_info = {}

def get_docker_info():
    containers = []
    for container in client.containers.list(all=True):
        try:
            created = container.attrs.get('Created', '')
            if created.endswith('Z'):
                created = created[:-1] + '+00:00'
            dt_created = datetime.fromisoformat(created) if created else datetime.now()
            uptime = int(time.time() - dt_created.timestamp())
        except Exception:
            uptime = 0

        # Determine the image to display and to use for update checks.
        if container.image.tags:
            display_image = container.image.tags[0]
            used_image = display_image
            up_to_date = image_update_info.get(container.name, True)
        elif "RepoDigests" in container.image.attrs and container.image.attrs["RepoDigests"]:
            # Extract the repository part (before '@')
            repo_digest = container.image.attrs["RepoDigests"][0]
            repo_name = repo_digest.split("@")[0]
            # For pulling, we append ":latest"
            used_image = repo_name + ":latest"
            # For display, we show only the repository name.
            display_image = repo_name
            up_to_date = image_update_info.get(container.name, True)
        else:
            display_image = "untagged"
            used_image = "untagged"
            up_to_date = False  # Force update available if no tag/digest available.

        containers.append({
            'name': container.name,
            'status': container.status,
            'image': display_image,
            'used_image': used_image,
            'created': container.attrs.get('Created', ''),
            'uptime': uptime,
            'up_to_date': up_to_date
        })
    return containers

prev_net_io = None
prev_net_time = None
network_history = {}  # Per-interface network stats

def update_stats_cache():
    global cached_stats, cached_heavy, last_heavy_update, last_disk_update, cached_disk_details
    global cpu_history, cpu_history_24h, last_cpu_24h_update, memory_history_24h, last_memory_24h_update
    global memory_history_basic, disk_history_basic, disk_history
    global prev_net_io, prev_net_time, network_history

    while True:
        try:
            cpu_percent = psutil.cpu_percent()
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            now_str = datetime.now().strftime('%H:%M:%S')
            # Update CPU short history
            cpu_history['time'].append(now_str)
            cpu_history['usage'].append(cpu_percent)
            if len(cpu_history['time']) > MAX_HISTORY:
                cpu_history['time'].pop(0)
                cpu_history['usage'].pop(0)
            
            # Update Memory basic history in GB
            total_mem_GB = mem.total / (1024 ** 3)
            free_GB = mem.free / (1024 ** 3)
            cached_GB = getattr(mem, 'cached', 0) / (1024 ** 3)
            used_no_cache_GB = (mem.used - getattr(mem, 'cached', 0)) / (1024 ** 3)
            memory_history_basic['time'].append(now_str)
            memory_history_basic['free'].append(round(free_GB, 2))
            memory_history_basic['used'].append(round(used_no_cache_GB, 2))
            memory_history_basic['cached'].append(round(cached_GB, 2))
            if len(memory_history_basic['time']) > MAX_HISTORY:
                memory_history_basic['time'].pop(0)
                memory_history_basic['free'].pop(0)
                memory_history_basic['used'].pop(0)
                memory_history_basic['cached'].pop(0)
            
            # Update Disk basic history in GiB
            total_disk_GB = round(disk.total / (1024 ** 3), 2)
            used_disk_GB = round(disk.used / (1024 ** 3), 2)
            free_disk_GB = round(disk.free / (1024 ** 3), 2)
            disk_history_basic['time'].append(now_str)
            disk_history_basic.setdefault('total', []).append(total_disk_GB)
            disk_history_basic.setdefault('used', []).append(used_disk_GB)
            disk_history_basic.setdefault('free', []).append(free_disk_GB)
            if len(disk_history_basic['time']) > MAX_HISTORY:
                disk_history_basic['time'].pop(0)
                disk_history_basic['total'].pop(0)
                disk_history_basic['used'].pop(0)
                disk_history_basic['free'].pop(0)
            
            current_time = time.time()
            if current_time - last_cpu_24h_update >= 10:
                cpu_history_24h.append({'time': current_time, 'usage': cpu_percent})
                twenty_four_hours_ago = current_time - 24 * 3600
                cpu_history_24h[:] = [entry for entry in cpu_history_24h if entry['time'] >= twenty_four_hours_ago]
                last_cpu_24h_update = current_time
            
            if current_time - last_memory_24h_update >= 10:
                memory_history_24h.append({'time': current_time, 'usage': round(mem.used / (1024 ** 3), 2)})
                twenty_four_hours_ago = current_time - 24 * 3600
                memory_history_24h[:] = [entry for entry in memory_history_24h if entry['time'] >= twenty_four_hours_ago]
                last_memory_24h_update = current_time
            
            if current_time - last_heavy_update >= 5:
                heavy_cpu_details = get_cpu_details()
                heavy_memory_details = get_memory_details()
                heavy_docker = get_docker_info()
                last_heavy_update = current_time
            else:
                heavy_cpu_details = cached_heavy.get('cpu_details', {})
                heavy_memory_details = cached_heavy.get('memory_details', {})
                heavy_docker = cached_heavy.get('docker', [])
            
            if current_time - last_disk_update >= 10:
                cached_disk_details = get_disk_details()
                last_disk_update = current_time
            
            cpu_history_24h_formatted = [
                {'time': datetime.fromtimestamp(entry['time']).strftime('%H:%M'),
                 'usage': entry['usage']}
                for entry in cpu_history_24h
            ]
            heavy_cpu_details['history24h'] = cpu_history_24h_formatted
            
            memory_history_24h_formatted = [
                {'time': datetime.fromtimestamp(entry['time']).strftime('%H:%M'),
                 'usage': entry['usage']}
                for entry in memory_history_24h
            ]
            heavy_memory_details['history24h'] = memory_history_24h_formatted
            
            cached_heavy = {
                'cpu_details': heavy_cpu_details,
                'memory_details': heavy_memory_details,
                'docker': heavy_docker,
                'disk_details': cached_disk_details
            }
            
            current_net = psutil.net_io_counters(pernic=True)
            net_current_time = current_time
            if prev_net_io is None:
                prev_net_io = current_net
                prev_net_time = net_current_time
            else:
                dt = net_current_time - prev_net_time
                for iface, stats in current_net.items():
                    prev_stats = prev_net_io.get(iface)
                    if prev_stats is not None:
                        input_speed = (stats.bytes_recv - prev_stats.bytes_recv) / dt / (1024 * 1024)
                        output_speed = (stats.bytes_sent - prev_stats.bytes_sent) / dt / (1024 * 1024)
                        if input_speed < 0.2:
                            input_speed = 0
                        if output_speed < 0.2:
                            output_speed = 0
                        if iface not in network_history:
                            network_history[iface] = []
                        network_history[iface].append({
                            'time': datetime.fromtimestamp(net_current_time).strftime('%H:%M:%S'),
                            'input': input_speed,
                            'output': output_speed
                        })
                        if len(network_history[iface]) > MAX_HISTORY:
                            network_history[iface].pop(0)
                prev_net_io = current_net
                prev_net_time = net_current_time
            
            cached_stats = {
                'system': {
                    'cpu': cpu_percent,
                    'memory': {
                        'percent': mem.percent,
                        'total': round(mem.total / (1024 ** 3), 2),
                        'used': round(mem.used / (1024 ** 3), 2),
                        'free': round(mem.free / (1024 ** 3), 2),
                        'cached': round(getattr(mem, 'cached', 0) / (1024 ** 3), 2)
                    },
                    'disk': {
                        'percent': disk.percent,
                        'total': round(disk.total / (1024 ** 3), 2),
                        'used': round(disk.used / (1024 ** 3), 2),
                        'free': round(disk.free / (1024 ** 3), 2)
                    },
                    'cpu_history': cpu_history,
                    'memory_history': memory_history_basic,
                    'disk_history_basic': disk_history_basic,
                    'cpu_details': cached_heavy.get('cpu_details', {}),
                    'memory_details': cached_heavy.get('memory_details', {}),
                    'disk_details': cached_heavy.get('disk_details', {})
                },
                'docker': cached_heavy.get('docker', [])
            }
            cached_stats['network'] = {'interfaces': network_history}
            logging.debug("Updated cached_stats: %s", cached_stats)
        except Exception as e:
            logging.error("Error updating cache: %s", e)
        time.sleep(0.25);
    # End while loop

def check_image_updates():
    global image_update_info
    while True:
        try:
            for container in client.containers.list(all=True):
                # Determine the image to pull.
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
                    latest_image = client.images.pull(image_tag)
                except Exception as e:
                    logging.error("Error pulling image %s for container %s: %s", image_tag, container.name, e)
                    continue
                up_to_date = (container.image.id == latest_image.id)
                image_update_info[container.name] = up_to_date
        except Exception as e:
            logging.error("Error checking image updates: %s", e)
        # For testing purposes, check every 60 seconds.
        time.sleep(60)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stats')
def stats():
    logging.debug("Returning cached_stats: %s", cached_stats)
    return jsonify(cached_stats)

@app.route('/update/<container_name>', methods=['POST'])
def update_container(container_name):
    try:
        container = client.containers.get(container_name)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Container not found: {str(e)}"}), 404

    try:
        config = container.attrs.get('Config', {})
        host_config = container.attrs.get('HostConfig', {})
        # Determine the image to use for update:
        if container.image.tags:
            image_tag = container.image.tags[0]
        else:
            repo_digest = container.image.attrs.get("RepoDigests", [])
            if repo_digest:
                repo_name = repo_digest[0].split("@")[0]
                image_tag = repo_name + ":latest"
            else:
                return jsonify({"status": "error", "message": "Container has no image tag or digest"}), 400

        cmd = config.get('Cmd')
        env = config.get('Env')
        ports = host_config.get('PortBindings')
        volumes = list(config.get('Volumes', {}).keys()) if config.get('Volumes') else None

        try:
            container.stop(timeout=10)
        except Exception as e:
            logging.error("Error stopping container: %s", e)
        container.remove()

        try:
            client.images.remove(image=image_tag, force=True)
        except Exception as e:
            logging.error("Error removing image: %s", e)

        client.images.pull(image_tag)

        new_container = client.containers.run(
            image=image_tag,
            name=container_name,
            command=cmd,
            environment=env,
            ports=ports,
            volumes=volumes,
            detach=True
        )
        return jsonify({"status": "success", "message": f"Container '{container_name}' updated successfully."})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error updating container: {str(e)}"}), 500

if __name__ == '__main__':
    threading.Thread(target=update_stats_cache, daemon=True).start()
    threading.Thread(target=check_image_updates, daemon=True).start()
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=True)
