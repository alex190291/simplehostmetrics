# simplehostmetrics.refac/models.py
from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin

db = SQLAlchemy()

# Association table for many-to-many relationship between Users and Roles
roles_users = db.Table(
    'roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

class Role(db.Model, RoleMixin):
    __tablename__ = 'role'
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))

class User(db.Model, UserMixin):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean(), default=True)
    fs_uniquifier = db.Column(db.String(255), unique=True, nullable=False)
    api_token = db.Column(db.String(255), unique=True, nullable=True)
    first_login = db.Column(db.Boolean(), default=True)
    roles = db.relationship('Role', secondary=roles_users, backref=db.backref('users', lazy='dynamic'))

# Neues Modell für Custom Network Graphs
class CustomNetworkGraph(db.Model):
    __tablename__ = 'custom_network_graph'
    id = db.Column(db.Integer, primary_key=True)
    graph_name = db.Column(db.String(255), nullable=False)
    # Speicherung als JSON (Liste von Interface-Konfigurationen)
    interfaces = db.Column(db.JSON, nullable=False)
