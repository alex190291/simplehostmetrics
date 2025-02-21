from operator import imod
from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
import threading
import logging
from flask_sqlalchemy import SQLAlchemy
from flask_security import Security, SQLAlchemyUserDatastore, login_required, current_user
from flask_security.utils import hash_password
import time
import rtad_manager

# Import our models (User, Role, CustomNetworkGraph defined in models.py)
from models import db, User, Role, CustomNetworkGraph

# Legacy modules and blueprints
import stats
import docker_manager
from custom_network import custom_network_bp
from database import initialize_database, load_history

app = Flask(__name__)

# Configuration (replace with secure keys in production)
app.config['DEBUG'] = False
app.config['SECRET_KEY'] = 'S3cUr3K3y!@#123'
app.config['SECURITY_PASSWORD_SALT'] = 'S3cUr3S@lt!@#123'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///stats.db'

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

    # Create default user if no users exist
    if User.query.count() == 0:
        user_datastore.create_user(
            email='admin@example.com',
            password=hash_password('changeme'),
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
@app.route('/rtad_lastb', methods=['GET'])
def get_rtad_lastb():
    """Gibt die gesammelten fehlgeschlagenen Login-Versuche als JSON zurück."""
    attempts = rtad_manager.fetch_login_attempts()
    return jsonify(attempts)

@app.route('/rtad_proxy', methods=['GET'])
def get_rtad_proxy():
    """Gibt die gesammelten HTTP-Error-Logs als JSON zurück."""
    logs = rtad_manager.fetch_http_error_logs()
    return jsonify(logs)

# Function to continuously run the RTAD log parser
def start_rtad_log_parser():
    # Instantiate the parser which also sets up the watchdog observer
    parser = rtad_manager.LogParser()
    # Trigger an initial parse to process existing logs
    parser.parse_log_files()
    # Keep this thread alive to allow watchdog's observer to function
    while True:
        time.sleep(10)

# Start the RTAD log parser in a daemon thread
threading.Thread(target=start_rtad_log_parser, daemon=True).start()

if __name__ == '__main__':
    threading.Thread(target=stats.update_stats_cache, daemon=True).start()
    threading.Thread(target=docker_manager.docker_info_updater, daemon=True).start()
    threading.Thread(target=docker_manager.check_image_updates, daemon=True).start()
    app.run(host='0.0.0.0', port=5000, debug=app.config['DEBUG'], use_reloader=True)
