# app.py
from flask import Flask, render_template, jsonify
import psutil
import docker
from datetime import datetime
from dateutil import parser
import time

app = Flask(__name__)
client = docker.from_env()

# Store CPU history
cpu_history = {'time': [], 'usage': []}
MAX_HISTORY = 30

def get_system_stats():
    # CPU
    cpu_percent = psutil.cpu_percent()
    
    # Memory
    mem = psutil.virtual_memory()
    mem_total_gb = round(mem.total / (1024 ** 3), 2)
    mem_used_gb = round(mem.used / (1024 ** 3), 2)
    mem_free_gb = round(mem.free / (1024 ** 3), 2)
    mem_percent = mem.percent
    
    # Disk
    disk = psutil.disk_usage('/')
    disk_total_gb = round(disk.total / (1024 ** 3), 2)
    disk_used_gb = round(disk.used / (1024 ** 3), 2)
    disk_free_gb = round(disk.free / (1024 ** 3), 2)
    disk_percent = disk.percent
    
    # Update CPU history
    now = datetime.now().strftime('%H:%M:%S')
    cpu_history['time'].append(now)
    cpu_history['usage'].append(cpu_percent)
    
    if len(cpu_history['time']) > MAX_HISTORY:
        cpu_history['time'].pop(0)
        cpu_history['usage'].pop(0)
    
    return {
        'cpu': cpu_percent,
        'memory': {
            'percent': mem_percent,
            'total': mem_total_gb,
            'used': mem_used_gb,
            'free': mem_free_gb
        },
        'disk': {
            'percent': disk_percent,
            'total': disk_total_gb,
            'used': disk_used_gb,
            'free': disk_free_gb
        },
        'cpu_history': cpu_history
    }

def get_docker_info():
    containers = []
    for container in client.containers.list(all=True):
        info = {
            'name': container.name,
            'status': container.status,
            'image': container.image.tags[0] if container.image.tags else 'N/A',
            'created': container.attrs['Created'],
            'uptime': int(time.time() - parser.parse(container.attrs['Created']).timestamp())
        }
        containers.append(info)
    return containers

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stats')
def stats():
    return jsonify({
        'system': get_system_stats(),
        'docker': get_docker_info()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
