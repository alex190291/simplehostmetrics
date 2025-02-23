##### /SPEAKING #####
# Below are the complete, updated files without placeholders.

# 1) app.py (route /attack_map removed)

```python
from operator import imod
from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
import threading
import logging
import time
import yaml
import requests
import docker

from flask_sqlalchemy import SQLAlchemy
from flask_security import Security, SQLAlchemyUserDatastore, login_required, current_user
from flask_security.utils import hash_password

import rtad_manager

# Import our models (User, Role, CustomNetworkGraph defined in models.py)
from models import db, User, Role, CustomNetworkGraph

import stats
import docker_manager
from custom_network import custom_network_bp
from database import initialize_database, load_history, get_country_centroid

NPM_API_URL = "http://npm.ganjagaming.de/api"
docker_client = docker.from_env()

app = Flask(__name__)

# Load configuration from config.yml
with open('config.yml', 'r') as f:
    config_data = yaml.safe_load(f)

# Set secret keys and other settings from config file
app.config['DEBUG'] = False
app.config['SECRET_KEY'] = config_data.get('secret_key', 'default-secret-key')
app.config['SECURITY_PASSWORD_SALT'] = config_data.get('security_password_salt', 'default-salt')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///../stats.db'

# Secure password hashing configuration
app.config['SECURITY_PASSWORD_HASH'] = 'bcrypt'
app.config['SECURITY_PASSWORD_SINGLE_HASH'] = False

# Disable registration since we'll create a default user
app.config['SECURITY_REGISTERABLE'] = False
app.config['SECURITY_SEND_REGISTER_EMAIL'] = False
app.config['SECURITY_RECOVERABLE'] = False

# Use custom login template (registration is not available)
app.config['SECURITY_LOGIN_USER_TEMPLATE'] = 'login_user.html'

# Initialize SQLAlchemy with our app
db.init_app(app)

# Create the user datastore
user_datastore = SQLAlchemyUserDatastore(db, User, Role)

# Initialize Flask-Security extension BEFORE creating default user
security = Security(app, user_datastore)

with app.app_context():
    # Create tables for User, Role, CustomNetworkGraph, etc.
    db.create_all()

    # Load default admin credentials from config file
    default_admin_email = config_data.get('default_admin_email', 'admin@example.com')
    default_admin_password = config_data.get('default_admin_password', 'changeme')

    # Create default user if no users exist
    if User.query.count() == 0:
        user_datastore.create_user(
            email=default_admin_email,
            password=hash_password(default_admin_password),
            first_login=True  # Mark as first login so user must update credentials
        )
        db.session.commit()

# Register the custom_network blueprint
app.register_blueprint(custom_network_bp)

# Initialize the legacy database schema (for stats and history) + new RTAD tables
initialize_database()
history_data = {
    'cpu_history': stats.cpu_history,
    'memory_history_basic': stats.memory_history_basic,
    'disk_history_basic': stats.disk_history_basic,
    'cpu_history_24h': stats.cpu_history_24h,
    'memory_history_24h': stats.memory_history_24h,
    'disk_history': stats.disk_history,
    'network_history': stats.network_history
}
load_history(history_data)

@app.before_request
def require_user_update():
    if current_user.is_authenticated:
        allowed = ['user_management', 'security.logout', 'static']
        if current_user.first_login:
            if request.endpoint not in allowed and not (request.endpoint and request.endpoint.startswith('static')):
                flash('Please update your default credentials.', 'info')
                return redirect(url_for('user_management'))

@app.route('/')
@login_required
def index():
    return render_template('index.html')

# User Management Tab for updating credentials on first login
@app.route('/user-management', methods=['GET', 'POST'])
@login_required
def user_management():
    if request.method == 'POST':
        new_email = request.form.get('email')
        new_password = request.form.get('password')
        if not new_email or not new_password:
            flash('Both email and password are required.', 'error')
            return redirect(url_for('user_management'))
        current_user.email = new_email
        current_user.password = hash_password(new_password)
        current_user.first_login = False
        db.session.commit()
        flash('Credentials updated successfully!', 'success')
        return redirect(url_for('index'))
    return render_template('user_management.html')

@app.route('/stats')
@login_required
def stats_route():
    stats.cached_stats['docker'] = docker_manager.docker_data_cache
    return jsonify(stats.cached_stats)

@app.route('/update/<container_name>', methods=['POST'])
@login_required
def update_container_route(container_name):
    result = docker_manager.update_container(container_name)
    return jsonify(result)

@app.route('/update_status/<container_name>')
@login_required
def update_status_route(container_name):
    status = docker_manager.get_update_status(container_name)
    return jsonify(status)

@app.route('/check/<container_name>', methods=['POST'])
@login_required
def check_container_route(container_name):
    result = docker_manager.check_container(container_name)
    return jsonify(result)

@app.route('/check_all', methods=['POST'])
@login_required
def check_all_route():
    result = docker_manager.check_all()
    return jsonify(result)

@app.route('/check_all_status', methods=['GET'])
@login_required
def check_all_status_route():
    status = docker_manager.get_all_status()
    return jsonify(status)

# New RTAD logs API endpoint for retrieving processed log and lastb data
@app.route('/rtad')
@login_required
def rtad():
    return render_template('rtad.html')

@app.route("/rtad_lastb")
@login_required
def rtad_lastb():
    # Force an update of country and city info before returning data
    rtad_manager.update_missing_country_info()
    last_id = request.args.get("last_id", default=None, type=int)
    attempts = rtad_manager.fetch_login_attempts()
    if last_id is not None:
        attempts = [attempt for attempt in attempts if attempt.get("id", 0) > last_id]
    else:
        attempts = attempts[-5000:]
    return jsonify(attempts)

@app.route("/rtad_proxy")
@login_required
def rtad_proxy():
    # Force an update of country and city info before returning data
    rtad_manager.update_missing_country_info()
    last_id = request.args.get("last_id", default=None, type=int)
    logs = rtad_manager.fetch_http_error_logs()
    if last_id is not None:
        logs = [log for log in logs if log.get("id", 0) > last_id]
    else:
        logs = logs[-5000:]
    return jsonify(logs)

# -----------------------------
# New Attack Map data endpoint (unchanged)
# -----------------------------
@app.route('/api/attack_map_data')
@login_required
def attack_map_data():
    """
    Combine /rtad_lastb and /rtad_proxy data, then attach latitude/longitude
    from country_centroids in the database.
    """
    # Force country and city info resolution in rtad_manager
    rtad_manager.update_missing_country_info()

    login_data = rtad_manager.fetch_login_attempts()
    proxy_data = rtad_manager.fetch_http_error_logs()
    results = []

    # Merge login attempts
    for item in login_data:
        country_code = item.get("country", "Unknown")
        lat, lon = get_country_centroid(country_code)
        results.append({
            "ip_address": item.get("ip_address"),
            "country": country_code,
            "city": item.get("city", "Unknown"),
            "lat": lat,
            "lon": lon,
            "timestamp": item.get("timestamp"),
            "type": "login",
            "user": item.get("user"),
            "failure_reason": item.get("failure_reason", "")
        })

    # Merge proxy logs
    for item in proxy_data:
        country_code = item.get("country", "Unknown")
        lat, lon = get_country_centroid(country_code)
        results.append({
            "ip_address": item.get("ip_address"),
            "country": country_code,
            "city": item.get("city", "Unknown"),
            "lat": lat,
            "lon": lon,
            "timestamp": item.get("timestamp"),
            "type": "proxy",
            "domain": item.get("domain"),
            "error_code": item.get("error_code"),
            "url": item.get("url"),
            "proxy_type": item.get("proxy_type", "")
        })

    return jsonify(results)

# -----------------------------
# Background Threads
# -----------------------------

# Function to continuously run the RTAD log parser
def start_rtad_log_parser():
    parser = rtad_manager.LogParser()
    parser.parse_log_files()
    while True:
        time.sleep(10)

# Start the RTAD log parser in a daemon thread
threading.Thread(target=start_rtad_log_parser, daemon=True).start()

if __name__ == '__main__':
    threading.Thread(target=stats.update_stats_cache, daemon=True).start()
    threading.Thread(target=docker_manager.docker_info_updater, daemon=True).start()
    threading.Thread(target=docker_manager.check_image_updates, daemon=True).start()
    threading.Thread(target=rtad_manager.update_country_info_job, daemon=True).start()
    app.run(host='0.0.0.0', port=5000, debug=app.config['DEBUG'], use_reloader=True)
