# simplehostmetrics/models.py
from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin
from sqlalchemy import Column, Integer, Float, String, BigInteger

db = SQLAlchemy()

# Association table for many-to-many relationship between Users and Roles
roles_users = db.Table(
    'roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

class Role(db.Model, RoleMixin):
    __tablename__ = 'role'
    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True)
    description = Column(String(255))

class User(db.Model, UserMixin):
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    active = Column(db.Boolean(), default=True)
    fs_uniquifier = Column(String(255), unique=True, nullable=False)
    api_token = Column(String(255), unique=True, nullable=True)
    first_login = Column(db.Boolean(), default=True)
    roles = db.relationship('Role', secondary=roles_users, backref=db.backref('users', lazy='dynamic'))

# Model for Custom Network Graphs
class CustomNetworkGraph(db.Model):
    __tablename__ = 'custom_network_graph'
    id = Column(Integer, primary_key=True)
    graph_name = Column(String(255), nullable=False)
    interfaces = Column(db.JSON, nullable=False)

# Model for security logs (RTAD)
class SecurityLog(db.Model):
    __tablename__ = 'security_log'
    id = Column(Integer, primary_key=True)
    ip = Column(String(255), nullable=False)
    action = Column(String(255), nullable=False)
    timestamp = Column(Integer, nullable=False)
    port = Column(Integer, nullable=False)
    extra_info = Column(String(255), nullable=True)

class AttackEntry(db.Model):
    __tablename__ = "attack_entries"
    id = Column(Integer, primary_key=True)
    type = Column(String, nullable=False)
    ip_address = Column(String)
    country = Column(String)
    city = Column(String)
    user = Column(String)
    failure_reason = Column(String)
    domain = Column(String)
    error_code = Column(String)
    url = Column(String)
    timestamp = Column(BigInteger)
    lat = Column(Float)
    lon = Column(Float)
    # Optional: Ländermittelpunkt-Koordinaten (sollten vorhanden sein, wenn city unbekannt ist)
    country_lat = Column(Float)
    country_lon = Column(Float)

class GeoCache(db.Model):
    __tablename__ = "geocoding_cache"
    id = Column(Integer, primary_key=True)
    city = Column(String, nullable=False)
    country = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
