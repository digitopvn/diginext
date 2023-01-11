#!/bin/bash

# Check if doctl is already installed
if command -v doctl &> /dev/null; then
  echo "doctl is already installed."
  exit 0
fi

# Install doctl

if [[ "$(uname -s)" == "Darwin" ]]; then
  # macOS
  brew install doctl
elif [[ -f /etc/redhat-release ]]; then
  # CentOS
  curl -sSL https://github.com/digitalocean/doctl/releases/download/v1.54.0/doctl-1.54.0-linux-amd64.tar.gz | tar -xvz
  mv doctl /usr/local/bin/
elif [[ -f /etc/lsb-release ]]; then
  # Ubuntu
  curl -sSL https://github.com/digitalocean/doctl/releases/download/v1.54.0/doctl-1.54.0-linux-amd64.tar.gz | tar -xvz
  mv doctl /usr/local/bin/
elif [[ "$(uname -s)" == "Windows" ]]; then
  # Windows
  choco install doctl
else
  echo "Unable to install doctl. Unknown operating system."
  exit 1
fi

echo "doctl has been successfully installed."