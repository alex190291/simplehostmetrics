# app.py
from flask import Flask, render_template, jsonify
import psutil
import docker
from datetime import datetime
import time
import os
import threading

app = Flask(__name__)
client = docker.from_env()

# History storage for CPU and /data folder size
cpu_history = {'time': [], 'usage': []}
MAX_HISTORY = 30
data_folder_history = []  # To store /data folder size history

def get_folder_size(folder):
    total = 0
    for dirpath, dirnames, filenames in os.walk(folder):
        for f in filenames:
            try:
                fp = os.path.join(dirpath, f)
                total += os.path.getsize(fp)
            except Exception:
                continue
    return total

def get_cpu_details():
    # Calculate 15-minute load average (steal load removed)
    try:
        load15 = psutil.getloadavg()[2]
    except Exception:
        load15 = 0
    procs = list(psutil.process_iter(['pid', 'name']))
    # Initialize measurement (first call always returns 0)
    for proc in procs:
        try:
            proc.cpu_percent(interval=None)
        except Exception:
            pass
    # Sleep to allow measurement; kept at 0.25 to maintain measurement consistency
    time.sleep(0.25)
    proc_list = []
    for proc in procs:
        try:
            cpu = proc.cpu_percent(interval=None)
            proc_list.append({'pid': proc.pid, 'name': proc.info['name'], 'cpu': cpu})
        except Exception:
            continue
    top5 = sorted(proc_list, key=lambda x: x['cpu'], reverse=True)[:5]
    return {
        'load15': load15,
        'top5': top5
    }

def get_memory_details():
    procs = []
    for proc in psutil.process_iter(['pid', 'name', 'memory_percent']):
        try:
            procs.append({'pid': proc.pid, 'name': proc.info['name'], 'memory': proc.info['memory_percent']})
        except Exception:
            continue
    top5 = sorted(procs, key=lambda x: x['memory'], reverse=True)[:5]
    return {
        'top5': top5
    }

def get_disk_details():
    disk = psutil.disk_usage('/')
    try:
        disk_data = psutil.disk_usage('/data')
    except Exception:
        disk_data = None
    now = time.time()
    try:
        data_folder_size = get_folder_size('/data')
    except Exception:
        data_folder_size = 0
    global data_folder_history
    data_folder_history.append({'time': now, 'size': data_folder_size})
    # Keep history for the last 7 days
    seven_days_ago = now - 7 * 24 * 3600
    data_folder_history = [entry for entry in data_folder_history if entry['time'] >= seven_days_ago]
    history = [
        {
            'time': datetime.fromtimestamp(entry['time']).strftime('%Y-%m-%d %H:%M:%S'),
            'size': round(entry['size'] / (1024 ** 2), 2)  # size in MB
        }
        for entry in data_folder_history
    ]
    return {
        'root': {
            'total': round(disk.total / (1024 ** 3), 2),
            'used': round(disk.used / (1024 ** 3), 2),
            'free': round(disk.free / (1024 ** 3), 2),
            'percent': disk.percent
        },
        'data': {
            'total': round(disk_data.total / (1024 ** 3), 2) if disk_data else 0,
            'used': round(disk_data.used / (1024 ** 3), 2) if disk_data else 0,
            'free': round(disk_data.free / (1024 ** 3), 2) if disk_data else 0,
            'percent': disk_data.percent if disk_data else 0
        },
        'history': history
    }

# Global cache for stats and heavy details
cached_stats = {}
cached_heavy = {}
last_heavy_update = 0

def get_docker_info():
    containers = []
    for container in client.containers.list(all=True):
        try:
            created = container.attrs.get('Created', '')
            # Use fromisoformat for faster parsing; adjust format if needed.
            if created.endswith('Z'):
                created = created[:-1] + '+00:00'
            dt_created = datetime.fromisoformat(created) if created else datetime.now()
            uptime = int(time.time() - dt_created.timestamp())
        except Exception:
            uptime = 0
        info = {
            'name': container.name,
            'status': container.status,
            'image': container.image.tags[0] if container.image.tags else 'N/A',
            'created': container.attrs.get('Created', ''),
            'uptime': uptime
        }
        containers.append(info)
    return containers

def update_stats_cache():
    global cached_stats, cached_heavy, last_heavy_update, cpu_history
    while True:
        try:
            # Light stats update (every 0.25 sec)
            cpu_percent = psutil.cpu_percent()
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Update CPU history
            now_str = datetime.now().strftime('%H:%M:%S')
            cpu_history['time'].append(now_str)
            cpu_history['usage'].append(cpu_percent)
            if len(cpu_history['time']) > MAX_HISTORY:
                cpu_history['time'].pop(0)
                cpu_history['usage'].pop(0)
            
            # Update heavy details every 2 seconds
            if time.time() - last_heavy_update >= 2:
                cached_heavy = {
                    'cpu_details': get_cpu_details(),
                    'memory_details': get_memory_details(),
                    'disk_details': get_disk_details(),
                    'docker': get_docker_info()
                }
                last_heavy_update = time.time()
            
            cached_stats = {
                'system': {
                    'cpu': cpu_percent,
                    'memory': {
                        'percent': mem.percent,
                        'total': round(mem.total / (1024 ** 3), 2),
                        'used': round(mem.used / (1024 ** 3), 2),
                        'free': round(mem.free / (1024 ** 3), 2),
                        'cached': round(mem.cached / (1024 ** 3), 2)
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
        except Exception as e:
            print("Error updating cache:", e)
        time.sleep(0.25)

# Start the cache updater thread on app startup
threading.Thread(target=update_stats_cache, daemon=True).start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stats')
def stats():
    # Return the cached stats
    return jsonify(cached_stats)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

