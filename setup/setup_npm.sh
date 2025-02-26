#!/bin/bash
set -e

# This script installs Nginx Proxy Manager using Docker and docker-compose.
# It checks for Docker and docker-compose, creates the working directory at
# /data/docker-compose/npm (if it doesn't exist), writes the docker-compose.yml,
# and starts the service.

# Check if Docker is installed
if ! command -v docker &>/dev/null; then
  echo "Docker is not installed. Please install Docker first."
  exit 1
fi

# Check if docker-compose is installed, if not, install it.
if ! command -v docker-compose &>/dev/null; then
  echo "docker-compose not found. Installing docker-compose..."
  sudo curl -L "https://github.com/docker/compose/releases/download/2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

# Define the installation directory
INSTALL_DIR="/data/docker-compose/npm"
echo "Creating installation directory at $INSTALL_DIR if it doesn't exist..."
sudo mkdir -p "$INSTALL_DIR"
# Ensure the current user owns the directory
sudo chown "$USER":"$USER" "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Write the docker-compose.yml file
cat > docker-compose.yml << 'EOF'
version: "3"
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: npm
    hostname: npm
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/hosts:/etc/hosts
      - /data/npm:/data
      - /etc/letsencrypt:/etc/letsencrypt
    networks:
      - frontend
      - backend

networks:
  frontend:
    driver: bridge
    internal: false
    attachable: true
    ipam:
      config:
        - subnet: 172.20.0.0/24
  backend:
    driver: bridge
    attachable: true
    ipam:
      config:
        - subnet: 172.22.0.0/16
EOF

echo "Starting Nginx Proxy Manager using docker-compose..."
docker-compose up -d

echo "Nginx Proxy Manager installation completed successfully."
