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

# History storage for CPU and "/" disk usage
cpu_history = {'time': [], 'usage': []}
MAX_HISTORY = 30
disk_history = []  # To store "/" filesystem usage history

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
    # Get "/" filesystem details only
    disk = psutil.disk_usage('/')
    now = time.time()
    global disk_history
    # Append current used space to history
    disk_history.append({'time': now, 'used': disk.used})
    # Keep history for the last 7 days
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

def get_docker_info():
    containers = []
    for container in client.containers.list(all=True):
        try:
            created = container.attrs.get('Created', '')
            # Adjust the ISO format if necessary
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
    global cached_stats, cached_heavy, last_heavy_update, last_disk_update, cached_disk_details, cpu_history
    # Initialize temporary storage for heavy details
    heavy_cpu_details = {}
    heavy_memory_details = {}
    heavy_docker = []
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
            
            current_time = time.time()
            # Update heavy details every 5 seconds (excluding disk details)
            if current_time - last_heavy_update >= 5:
                heavy_cpu_details = get_cpu_details()
                heavy_memory_details = get_memory_details()
                heavy_docker = get_docker_info()
                last_heavy_update = current_time
            
            # Update disk details only every 5 minutes (300 seconds)
            if current_time - last_disk_update >= 300:
                cached_disk_details = get_disk_details()
                last_disk_update = current_time
            
            cached_heavy = {
                'cpu_details': heavy_cpu_details,
                'memory_details': heavy_memory_details,
                'docker': heavy_docker,
                'disk_details': cached_disk_details
            }
            
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
