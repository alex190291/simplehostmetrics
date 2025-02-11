# simplehostmetrics.refac/app.py
from flask import Flask, render_template, jsonify, request
import threading
import logging
from database import initialize_database, load_history
from stats import update_stats_cache, cached_stats, cpu_history, memory_history_basic, disk_history_basic, cpu_history_24h, memory_history_24h, disk_history, network_history
import stats
import docker_manager

# Import the custom network blueprint from our new module
from custom_network import custom_network_bp

# Logging configuration
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)

# Register custom network blueprint
app.register_blueprint(custom_network_bp)

# Initialize the database
initialize_database()

# Load historical data from the database into in-memory caches
history_data = {
    'cpu_history': cpu_history,
    'memory_history_basic': memory_history_basic,
    'disk_history_basic': disk_history_basic,
    'cpu_history_24h': cpu_history_24h,
    'memory_history_24h': memory_history_24h,
    'disk_history': disk_history,
    'network_history': network_history
}
load_history(history_data)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stats')
def stats_route():
    # Supplement docker information
    stats.cached_stats['docker'] = docker_manager.docker_data_cache
    return jsonify(stats.cached_stats)

@app.route('/update/<container_name>', methods=['POST'])
def update_container_route(container_name):
    result = docker_manager.update_container(container_name)
    return jsonify(result)

@app.route('/update_status/<container_name>')
def update_status_route(container_name):
    status = docker_manager.get_update_status(container_name)
    return jsonify(status)

@app.route('/check/<container_name>', methods=['POST'])
def check_container_route(container_name):
    result = docker_manager.check_container(container_name)
    return jsonify(result)

@app.route('/check_all', methods=['POST'])
def check_all_route():
    result = docker_manager.check_all()
    return jsonify(result)

@app.route('/check_all_status', methods=['GET'])
def check_all_status_route():
    status = docker_manager.get_all_status()
    return jsonify(status)

if __name__ == '__main__':
    # Start background threads for stats and docker updates
    threading.Thread(target=update_stats_cache, daemon=True).start()
    threading.Thread(target=docker_manager.docker_info_updater, daemon=True).start()
    threading.Thread(target=docker_manager.check_image_updates, daemon=True).start()
    # The app now supports multiple custom network graphs via the enhanced modal.
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=True)
