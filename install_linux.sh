#!/bin/bash

# ==============================================================================
# Finance Tracker - Linux Systemd Service Installation Script
# ==============================================================================

# Ensure running with root privileges
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script with sudo (e.g., sudo ./install_linux.sh)"
  exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found, please install Python 3 first."
    exit 1
fi

# Install Flask dependency
echo "Installing Flask dependency..."
python3 -m pip install flask --quiet

# Get absolute path of the current application
APP_DIR=$(pwd)
SERVICE_NAME="finance-tracker.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"

# Determine non-root user for running the service (original user calling sudo)
RUN_USER=${SUDO_USER:-$(whoami)}

echo "Registering $APP_DIR as a system service..."

# Create Systemd unit file
cat <<EOF > $SERVICE_PATH
[Unit]
Description=Finance Tracker Web Service
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
# Run the Flask application
ExecStart=$(which python3) app.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd configuration, enable auto-start and start service immediately
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

echo "================================================================"
echo "✅ Installation successful!"
echo "The application is now running in the background and auto-start is enabled."
echo "Please visit in your browser: http://localhost:5000"
echo "Command to check service status: sudo systemctl status $SERVICE_NAME"
echo "================================================================"
