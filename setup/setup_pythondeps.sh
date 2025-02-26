#!/bin/bash
set -e

# Install all required Python packages
pip install Flask PyYAML requests docker flask-sqlalchemy flask-security psutil sqlalchemy geoip2 pytz watchdog
