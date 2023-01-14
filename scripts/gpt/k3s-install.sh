#!/bin/bash

# Check if k3s is already installed
if command -v k3s &>/dev/null; then
    echo "k3s is already installed."
    exit 0
fi

# Install k3s

if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    curl -sfL https://get.k3s.io | sh -
elif [[ -f /etc/redhat-release ]]; then
    # CentOS
    curl -sfL https://get.k3s.io | sh -
elif [[ -f /etc/lsb-release ]]; then
    # Ubuntu
    curl -sfL https://get.k3s.io | sh -
elif [[ "$(uname -s)" == "Windows" ]]; then
    # Windows
    curl -sfL https://get.k3s.io | sh -
else
    echo "Unable to install k3s. Unknown operating system."
    exit 1
fi

# Check if k3s is installed
if ! command -v k3s &>/dev/null; then
    echo "k3s is not installed. Please install k3s first."
    exit 1
fi

# Copy k3s.yaml and node-token to correct directories

if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    sudo cp /etc/rancher/k3s/k3s.yaml /usr/local/etc/k3s/k3s.yaml
    sudo cp /etc/rancher/k3s/server/node-token /usr/local/etc/k3s/node-token
elif [[ -f /etc/redhat-release ]]; then
    # CentOS
    sudo cp /etc/rancher/k3s/k3s.yaml /usr/local/etc/k3s/k3s.yaml
    sudo cp /etc/rancher/k3s/server/node-token /usr/local/etc/k3s/node-token
elif [[ -f /etc/lsb-release ]]; then
    # Ubuntu
    sudo cp /etc/rancher/k3s/k3s.yaml /usr/local/etc/k3s/k3s.yaml
    sudo cp /etc/rancher/k3s/server/node-token /usr/local/etc/k3s/node-token
else
    echo "Unable to copy k3s.yaml and node-token. Unknown operating system."
    exit 1
fi

# Check if k3s is installed
if [[ "$(uname -s)" == "Darwin" ]]; then
    # macOS
    # TODO: add startup script for macOS
elif [[ -f /etc/redhat-release ]]; then
    # CentOS
    if ! command -v k3s &>/dev/null; then
        echo "k3s is not installed. Please install k3s first."
        exit 1
    fi

    # Check if Systemd is installed
    if ! command -v systemctl &>/dev/null; then
        echo "Systemd is not installed. Please install Systemd first."
        exit 1
    fi

    # Create a Systemd unit file for k3s
    cat <<EOF >/etc/systemd/system/k3s.service
[Unit]
Description=Lightweight Kubernetes
Documentation=https://k3s.io
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/k3s server
ExecStop=/usr/local/bin/k3s kill
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    # Reload the Systemd daemon to pick up the new unit file
    systemctl daemon-reload

    # Enable the k3s service to start automatically on system boot
    systemctl enable k3s

    # Start the k3s
    systemctl start k3s

    # Check the status of k3s
    systemctl status k3s
elif [[ -f /etc/lsb-release ]]; then
    # Ubuntu
    # Check if k3s is installed
    if ! command -v k3s &>/dev/null; then
        echo "k3s is not installed. Please install k3s first."
        exit 1
    fi

    # Check if Systemd is installed
    if ! command -v systemctl &>/dev/null; then
        echo "Systemd is not installed. Please install Systemd first."
        exit 1
    fi

    # Create a Systemd unit file for k3s
    cat <<EOF >/etc/systemd/system/k3s.service
[Unit]
Description=Lightweight Kubernetes
Documentation=https://k3s.io
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/k3s server
ExecStop=/usr/local/bin/k3s kill
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    # Reload the Systemd daemon to pick up the new unit file
    systemctl daemon-reload

    # Enable the k3s service to start automatically on system boot
    systemctl enable k3s

    # Start the k3s service
    systemctl start k3s

    # Verify that the k3s service is running
    systemctl status k3s
else
    echo "Unable to start k3s as a service. Unknown operating system."
    exit 1
fi

echo "k3s has been successfully installed."
