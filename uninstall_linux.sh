#!/bin/bash

# ==============================================================================
# Finance Tracker - Linux Systemd Service Uninstallation Script
# ==============================================================================

# Ensure running with root privileges
if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run this script with sudo (e.g., sudo ./uninstall_linux.sh)"
  exit 1
fi

SERVICE_NAME="finance-tracker.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"

echo "Stopping and removing service..."

# Stop and disable service
systemctl stop $SERVICE_NAME 2>/dev/null
systemctl disable $SERVICE_NAME 2>/dev/null

# Delete unit file
if [ -f "$SERVICE_PATH" ]; then
    rm "$SERVICE_PATH"
    echo "Deleted service file: $SERVICE_PATH"
fi

# Reload systemd configuration
systemctl daemon-reload

echo "✅ Uninstallation successful! Background service stopped and auto-start disabled."
