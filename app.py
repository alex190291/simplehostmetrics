from flask import Flask, render_template, jsonify, request
import psutil
import docker
from datetime import datetime
import time
import threading

app = Flask(__name__)
client = docker.from_env()

# History storage for CPU (short and 24hr) and "/" disk usage
cpu_history = {'time': [], 'usage': []}  # for basic chart (last 30 samples)
cpu_history_24h = []  # for detailed 24hr chart, sampled every 10 seconds
memory_history_24h = []  # for detailed 24hr memory usage history (percentage), sampled every 10 seconds
MAX_HISTORY = 30
disk_history = []  # to store "/" filesystem usage history

# Global variables for scheduling 24hr history updates
last_cpu_24h_update = 0
last_memory_24h_update = 0

def get_cpu_details():
    # Return only the 15-min load average
    try:
        load15 = psutil.getloadavg()[2]
    except Exception:
        load15 = 0
    return {'load15': load15}

def get_memory_details():
    return {}

def get_disk_details():
    # Get "/" filesystem details only
    disk = psutil.disk_usage('/')
    now = time.time()
    global disk_history
    disk_history.append({'time': now, 'used': disk.used})
    seven_days_ago = now - 7 * 24 * 3600
    disk_history = [entry for entry in disk_history if entry['time'] >= seven_days_ago]
    history = [
        {
            'time': datetime.fromtimestamp(entry['time']).strftime('%Y-%m-%d %H:%M:%S'),
            'used': round(entry['used'] / (1024 ** 2), 2)  # used space in MB
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

# Global cache for stats and heavy details
cached_stats = {}
cached_heavy = {}
last_heavy_update = 0
last_disk_update = 0
cached_disk_details = {}

# Global dictionary to store update status for each container by name.
# True means the container’s image is up to date.
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
        image_tag = container.image.tags[0] if container.image.tags else 'N/A'
        # Look up the image update status from our global dictionary.
        # Default to True (up-to-date) if no check has been done yet.
        up_to_date = image_update_info.get(container.name, True)
        info = {
            'name': container.name,
            'status': container.status,
            'image': image_tag,
            'created': container.attrs.get('Created', ''),
            'uptime': uptime,
            'up_to_date': up_to_date
        }
        containers.append(info)
    return containers

# Global variables for network throughput stats.
prev_net_io = None
prev_net_time = None
network_history = {}  # Structure: { interface_name: [ {time, input, output}, ... ] }

def update_stats_cache():
    global cached_stats, cached_heavy, last_heavy_update, last_disk_update, cached_disk_details
    global cpu_history, cpu_history_24h, last_cpu_24h_update, memory_history_24h, last_memory_24h_update
    global prev_net_io, prev_net_time, network_history
    while True:
        try:
            cpu_percent = psutil.cpu_percent()
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            now_str = datetime.now().strftime('%H:%M:%S')
            cpu_history['time'].append(now_str)
            cpu_history['usage'].append(cpu_percent)
            if len(cpu_history['time']) > MAX_HISTORY:
                cpu_history['time'].pop(0)
                cpu_history['usage'].pop(0)
            
            current_time = time.time()
            if current_time - last_cpu_24h_update >= 10:
                cpu_history_24h.append({'time': current_time, 'usage': cpu_percent})
                twenty_four_hours_ago = current_time - 24 * 3600
                cpu_history_24h[:] = [entry for entry in cpu_history_24h if entry['time'] >= twenty_four_hours_ago]
                last_cpu_24h_update = current_time
            
            if current_time - last_memory_24h_update >= 10:
                memory_history_24h.append({'time': current_time, 'usage': mem.percent})
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
            
            if current_time - last_disk_update >= 300:
                cached_disk_details = get_disk_details()
                last_disk_update = current_time
            
            cpu_history_24h_formatted = [
                {
                    'time': datetime.fromtimestamp(entry['time']).strftime('%H:%M'),
                    'usage': entry['usage']
                }
                for entry in cpu_history_24h
            ]
            heavy_cpu_details['history24h'] = cpu_history_24h_formatted
            
            memory_history_24h_formatted = [
                {
                    'time': datetime.fromtimestamp(entry['time']).strftime('%H:%M'),
                    'usage': entry['usage']
                }
                for entry in memory_history_24h
            ]
            heavy_memory_details['history24h'] = memory_history_24h_formatted
            
            cached_heavy = {
                'cpu_details': heavy_cpu_details,
                'memory_details': heavy_memory_details,
                'docker': heavy_docker,
                'disk_details': cached_disk_details
            }
            
            # Update network stats.
            current_net = psutil.net_io_counters(pernic=True)
            net_current_time = current_time  # reuse current_time
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
                        # Ignore traffic below 200KB/s (~0.2 MiB/s)
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
                    'cpu_details': cached_heavy.get('cpu_details', {}),
                    'memory_details': cached_heavy.get('memory_details', {}),
                    'disk_details': cached_heavy.get('disk_details', {})
                },
                'docker': cached_heavy.get('docker', [])
            }
            # Include network stats in the cached stats.
            cached_stats['network'] = {
                'interfaces': network_history
            }
        except Exception as e:
            print("Error updating cache:", e)
        time.sleep(0.25)

def check_image_updates():
    """Every eight hours, check for each container whether its image is up-to-date.
       For each container, we pull the image and compare the image id with the one
       used by the running container. (Note that pulling a new image will update the local copy,
       but the running container continues to use the old image until it is re-created.)
    """
    global image_update_info
    while True:
        try:
            for container in client.containers.list(all=True):
                if not container.image.tags:
                    continue  # skip if no tag available
                image_tag = container.image.tags[0]
                try:
                    # Pull the latest image from the registry.
                    latest_image = client.images.pull(image_tag)
                except Exception as e:
                    print(f"Error pulling image {image_tag} for container {container.name}: {e}")
                    continue
                # Compare the IDs.
                # (If they differ, then an update is available.)
                up_to_date = (container.image.id == latest_image.id)
                image_update_info[container.name] = up_to_date
        except Exception as e:
            print("Error checking image updates:", e)
        # Sleep for eight hours (8*3600 seconds)
        time.sleep(8 * 3600)

# Start the background threads
threading.Thread(target=update_stats_cache, daemon=True).start()
threading.Thread(target=check_image_updates, daemon=True).start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stats')
def stats():
    return jsonify(cached_stats)

@app.route('/update/<container_name>', methods=['POST'])
def update_container(container_name):
    """Update a container by removing it and its image then re-creating it with the same settings."""
    try:
        container = client.containers.get(container_name)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Container not found: {str(e)}"}), 404

    try:
        # Get basic configuration from the container's attributes.
        config = container.attrs.get('Config', {})
        host_config = container.attrs.get('HostConfig', {})

        # Save settings (a best‐effort; not all settings are re-creatable)
        image_tag = container.image.tags[0] if container.image.tags else None
        if image_tag is None:
            return jsonify({"status": "error", "message": "Container has no image tag"}), 400

        cmd = config.get('Cmd')
        env = config.get('Env')
        # For ports, we try to extract the port bindings from HostConfig.
        ports = host_config.get('PortBindings')
        # For volumes, we check the container config
        volumes = list(config.get('Volumes', {}).keys()) if config.get('Volumes') else None

        # Stop and remove the container.
        try:
            container.stop(timeout=10)
        except Exception as e:
            print("Error stopping container:", e)
        container.remove()

        # Remove the old image (force removal).
        try:
            client.images.remove(image=image_tag, force=True)
        except Exception as e:
            print("Error removing image:", e)

        # Pull the latest image.
        client.images.pull(image_tag)

        # Re-create and start the container.
        # (Note: this is a best‐effort re-creation and may need adjustment for your production use.)
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
    app.run(host='0.0.0.0', port=5000, debug=True)
