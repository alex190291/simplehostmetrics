from flask import Flask, render_template, jsonify, request, redirect, url_for, flash
import threading
import logging
import time
import yaml
import requests
import docker
import os
from urllib.parse import urljoin

from flask_sqlalchemy import SQLAlchemy
from flask_security.utils import hash_password
from flask_security import Security, SQLAlchemyUserDatastore, login_required, current_user

import rtad_manager
from models import db, User, Role, CustomNetworkGraph
import stats
import docker_manager
from custom_network import custom_network_bp
from database import initialize_database, load_history

# Flask-Assets for SCSS compilation
from flask_assets import Environment, Bundle

# Load configuration from config.yml
with open('config.yml', 'r') as f:
    config_data = yaml.safe_load(f)

app = Flask(__name__)

# Set secret keys and other settings from config file
app.config['DEBUG'] = False
app.config['SECRET_KEY'] = config_data.get('secret_key', 'default-secret-key')
app.config['SECURITY_PASSWORD_SALT'] = config_data.get('security_password_salt', 'default-salt')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///../stats.db'
app.config['SECURITY_PASSWORD_HASH'] = 'bcrypt'
app.config['SECURITY_PASSWORD_SINGLE_HASH'] = False
app.config['SECURITY_REGISTERABLE'] = False
app.config['SECURITY_SEND_REGISTER_EMAIL'] = False
app.config['SECURITY_RECOVERABLE'] = False
app.config['SECURITY_LOGIN_USER_TEMPLATE'] = 'login_user.html'
app.config['npm'] = config_data.get('npm', {})

# Initialize Flask-Assets
assets = Environment(app)
assets.directory = os.path.join(app.root_path, 'static')
assets.url = app.static_url_path

# Define the SCSS bundle using libsass
scss_bundle = Bundle(
    'main.scss',
    filters='libsass',
    output='style.css'
)
assets.register('scss_all', scss_bundle)
scss_bundle.build()

# Initialize SQLAlchemy with our app
db.init_app(app)

# Create the user datastore
user_datastore = SQLAlchemyUserDatastore(db, User, Role)

# Initialize Flask-Security extension BEFORE creating default user
security = Security(app, user_datastore)

with app.app_context():
    # Create tables for User, Role, CustomNetworkGraph, etc.
    db.create_all()
    default_admin_email = config_data.get('default_admin_email', 'admin@example.com')
    default_admin_password = config_data.get('default_admin_password', 'changeme')
    if User.query.count() == 0:
        user_datastore.create_user(
            email=default_admin_email,
            password=hash_password(default_admin_password),
            first_login=True
        )
        db.session.commit()

# Register the custom_network blueprint
app.register_blueprint(custom_network_bp)

# Initialize the legacy database schema and load history data
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

# Set NPM domain and API URL from config_data
NPM_DOMAIN = config_data["npm"]["domain"]
NPM_API_URL = f"http://{NPM_DOMAIN}/api"
docker_client = docker.from_env()

# --- NPM Token Manager for production ---
class NPMTokenManager:
    def __init__(self, domain, identity, secret):
        self.domain = domain
        self.identity = identity
        self.secret = secret
        self.token = None
        self.token_expiry = 0

    def get_token(self):
        now = time.time()
        if self.token is None or now >= self.token_expiry:
            self.refresh_token()
        return self.token

    def refresh_token(self):
        token_url = f"http://{self.domain}/api/tokens"
        payload = {
            "identity": self.identity,
            "secret": self.secret
        }
        try:
            app.logger.debug(f"Requesting new NPM token from {token_url} with payload {payload}")
            token_response = requests.post(token_url, json=payload, verify=False)
            if token_response.status_code != 200:
                app.logger.error(f"Token retrieval failed: {token_response.text}")
                raise Exception("Token retrieval failed")
            json_data = token_response.json()
            self.token = json_data.get("token")
            expires_in = json_data.get("expires_in", 3600)
            self.token_expiry = time.time() + expires_in - 60
            if not self.token:
                app.logger.error("Token not found in response")
                raise Exception("Token not found in response")
            app.logger.debug(f"Obtained NPM token, expires in {expires_in} seconds")
        except requests.RequestException as e:
            app.logger.error(f"Error retrieving token: {str(e)}")
            raise e

npm_config = config_data.get("npm", {})
NPM_IDENTITY = npm_config.get("identity")
NPM_SECRET = npm_config.get("secret")
if not (NPM_DOMAIN and NPM_IDENTITY and NPM_SECRET):
    app.logger.error("NPM configuration incomplete in config.yml")
    raise Exception("Incomplete NPM configuration")
NPM_TOKEN_MANAGER = NPMTokenManager(NPM_DOMAIN, NPM_IDENTITY, NPM_SECRET)

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

@app.route("/npm", methods=["GET"])
@login_required
def npm_view():
    domain = config_data["npm"]["domain"]
    return render_template("npm.html", npm_domain=domain)

@app.route("/npm/settings", methods=["GET", "POST"])
@login_required
def npm_settings():
    global NPM_API_URL
    if request.method == "POST":
        new_domain = request.form.get("domain")
        if new_domain:
            config_data["npm"]["domain"] = new_domain
            NPM_API_URL = f"http://{new_domain}/api"
            with open("config.yml", "w") as f:
                yaml.safe_dump(config_data, f)
            flash("NPM domain updated successfully!", "success")
            return redirect(url_for("npm_settings"))
        else:
            flash("Please provide a valid domain.", "error")
    current_domain = config_data["npm"]["domain"]
    return render_template("npm_settings.html", current_domain=current_domain)

@app.route('/npm-api', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE'])
@app.route('/npm-api/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE'])
@app.route('/npm-api/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
def npm_proxy(path):
    npm_domain = config_data['npm']['domain']
    npm_url = f'http://{npm_domain}/api/'
    target_url = urljoin(npm_url, path)
    app.logger.debug(f"NPM Proxy request to: {target_url}")
    app.logger.debug(f"Method: {request.method}")
    app.logger.debug(f"Headers: {dict(request.headers)}")
    try:
        token = NPM_TOKEN_MANAGER.get_token()
        headers = {k: v for k, v in request.headers.items() if k.lower() not in ['host', 'content-length']}
        headers['Authorization'] = f'Bearer {token}'
        response = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.get_data(),
            cookies=request.cookies,
            allow_redirects=False,
            verify=False
        )
        app.logger.debug(f"NPM Response status: {response.status_code}")
        app.logger.debug(f"NPM Response headers: {dict(response.headers)}")
        return (
            response.content,
            response.status_code,
            {k: v for k, v in response.headers.items() if k.lower() not in ['content-encoding', 'content-length', 'transfer-encoding']}
        )
    except requests.RequestException as e:
        app.logger.error(f"NPM Proxy error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/rtad')
@login_required
def rtad():
    return render_template('rtad.html')

@app.route("/rtad_lastb")
@login_required
def rtad_lastb():
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
    rtad_manager.update_missing_country_info()
    last_id = request.args.get("last_id", default=None, type=int)
    logs = rtad_manager.fetch_http_error_logs()
    if last_id is not None:
        logs = [log for log in logs if log.get("id", 0) > last_id]
    else:
        logs = logs[-5000:]
    return jsonify(logs)

@app.route('/api/attack_map_data')
@login_required
def attack_map_data():
    rtad_manager.update_missing_country_info()
    login_data = rtad_manager.fetch_login_attempts()[-1000:]
    proxy_data = rtad_manager.fetch_http_error_logs()[-1000:]
    results = []
    for item in login_data:
        results.append({
            "ip_address": item.get("ip_address"),
            "country": item.get("country", "Unknown"),
            "city": item.get("city", "Unknown"),
            "lat": item.get("lat", 0) or 0,
            "lon": item.get("lon", 0) or 0,
            "timestamp": item.get("timestamp"),
            "type": "login",
            "user": item.get("user"),
            "failure_reason": item.get("failure_reason", "")
        })
    for item in proxy_data:
        results.append({
            "ip_address": item.get("ip_address"),
            "country": item.get("country", "Unknown"),
            "city": item.get("city", "Unknown"),
            "lat": item.get("lat", 0) or 0,
            "lon": item.get("lon", 0) or 0,
            "timestamp": item.get("timestamp"),
            "type": "proxy",
            "domain": item.get("domain"),
            "error_code": item.get("error_code"),
            "url": item.get("url"),
            "proxy_type": item.get("proxy_type", "")
        })
    return jsonify(results)

def start_rtad_log_parser():
    parser = rtad_manager.LogParser()
    parser.parse_log_files()
    while True:
        time.sleep(10)

with app.app_context():
    rtad_manager.ensure_geolite2_db(rtad_manager.GEOIP_DB_PATH)
    # Start background threads
    threading.Thread(target=start_rtad_log_parser, daemon=True).start()
    threading.Thread(target=stats.update_stats_cache, daemon=True).start()
    threading.Thread(target=docker_manager.docker_info_updater, daemon=True).start()
    threading.Thread(target=docker_manager.check_image_updates, daemon=True).start()
    threading.Thread(target=rtad_manager.update_country_info_job, daemon=True).start()

if __name__ == '__main__':
    rtad_manager.ensure_geolite2_db(rtad_manager.GEOIP_DB_PATH)
    # Start background threads
    threading.Thread(target=start_rtad_log_parser, daemon=True).start()
    threading.Thread(target=stats.update_stats_cache, daemon=True).start()
    threading.Thread(target=docker_manager.docker_info_updater, daemon=True).start()
    threading.Thread(target=docker_manager.check_image_updates, daemon=True).start()
    threading.Thread(target=rtad_manager.update_country_info_job, daemon=True).start()

    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=app.config['DEBUG'], use_reloader=True)

# this is a comment
