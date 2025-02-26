# simplehostmetrics/models.py
# This module defines the SQLAlchemy models for the application.
# It includes models for user authentication and authorization, custom network graphs,
# security logs, attack entries, and a geo-coding cache.

from flask_sqlalchemy import SQLAlchemy           # For SQLAlchemy integration with Flask.
from flask_security import UserMixin, RoleMixin     # For integrating user and role management.
from sqlalchemy import Column, Integer, Float, String, BigInteger  # SQLAlchemy column types.

# Initialize the SQLAlchemy database instance.
db = SQLAlchemy()

# Association table for the many-to-many relationship between Users and Roles.
roles_users = db.Table(
    'roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

class Role(db.Model, RoleMixin):
    """
    Role Model:
    Represents a user role with a unique name and a description.
    Inherits from RoleMixin to integrate with Flask-Security.
    """
    __tablename__ = 'role'
    id = Column(Integer, primary_key=True)         # Primary key for the role.
    name = Column(String(80), unique=True)           # Unique name for the role.
    description = Column(String(255))                # Description of the role.

class User(db.Model, UserMixin):
    """
    User Model:
    Represents an application user with authentication and authorization details.
    Inherits from UserMixin to integrate with Flask-Security.
    """
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True)           # Primary key for the user.
    email = Column(String(255), unique=True, nullable=False)   # User's email address.
    password = Column(String(255), nullable=False)     # User's hashed password.
    active = Column(db.Boolean(), default=True)        # User account active status.
    fs_uniquifier = Column(String(255), unique=True, nullable=False)  # Unique identifier for Flask-Security.
    api_token = Column(String(255), unique=True, nullable=True)         # Optional API token for the user.
    first_login = Column(db.Boolean(), default=True)   # Flag to indicate if it's the user's first login.
    # Relationship to associate the user with multiple roles.
    roles = db.relationship('Role', secondary=roles_users, backref=db.backref('users', lazy='dynamic'))

class CustomNetworkGraph(db.Model):
    """
    CustomNetworkGraph Model:
    Represents a custom network graph configuration with a graph name and
    a list of interfaces (stored as JSON) used to generate the graph.
    """
    __tablename__ = 'custom_network_graph'
    id = Column(Integer, primary_key=True)           # Primary key for the network graph.
    graph_name = Column(String(255), nullable=False)   # Name of the network graph.
    interfaces = Column(db.JSON, nullable=False)       # JSON data representing graph interfaces.

class SecurityLog(db.Model):
    """
    SecurityLog Model:
    Represents a security log entry, tracking actions such as connection attempts.
    Includes information like IP, action performed, timestamp, port, and any extra info.
    """
    __tablename__ = 'security_log'
    id = Column(Integer, primary_key=True)           # Primary key for the security log.
    ip = Column(String(255), nullable=False)           # IP address involved in the log.
    action = Column(String(255), nullable=False)       # Description of the action taken.
    timestamp = Column(Integer, nullable=False)        # Timestamp of the log entry (as an integer).
    port = Column(Integer, nullable=False)             # Port number associated with the action.
    extra_info = Column(String(255), nullable=True)      # Optional field for additional information.

class AttackEntry(db.Model):
    """
    AttackEntry Model:
    Represents an entry for an attack or failed attempt, including various details such as
    type, IP address, country, city, user involved, failure reason, domain, error code,
    URL, timestamp, and geolocation data.
    Also includes optional fields for country centroid coordinates.
    """
    __tablename__ = "attack_entries"
    id = Column(Integer, primary_key=True)           # Primary key for the attack entry.
    type = Column(String, nullable=False)              # Type of attack or event.
    ip_address = Column(String)                        # IP address involved in the attack.
    country = Column(String)                           # Country associated with the IP.
    city = Column(String)                              # City associated with the IP.
    user = Column(String)                              # User related to the event (if applicable).
    failure_reason = Column(String)                    # Reason for the failure (if applicable).
    domain = Column(String)                            # Domain associated with the event.
    error_code = Column(String)                        # HTTP or other error code.
    url = Column(String)                               # URL involved in the attack.
    timestamp = Column(BigInteger)                     # Timestamp of the event as a big integer.
    lat = Column(Float)                                # Latitude from geolocation lookup.
    lon = Column(Float)                                # Longitude from geolocation lookup.
    # Optional fields: Country centroid coordinates used as fallback if city info is unavailable.
    country_lat = Column(Float)
    country_lon = Column(Float)

class GeoCache(db.Model):
    """
    GeoCache Model:
    Represents a cache entry for geocoding results.
    Stores city, country, and the corresponding latitude and longitude.
    """
    __tablename__ = "geocoding_cache"
    id = Column(Integer, primary_key=True)           # Primary key for the geo cache entry.
    city = Column(String, nullable=False)              # City name.
    country = Column(String, nullable=False)           # Country name.
    lat = Column(Float, nullable=False)                # Latitude coordinate.
    lon = Column(Float, nullable=False)                # Longitude coordinate.
