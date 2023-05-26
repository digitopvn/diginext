#!/bin/bash

# Check if Node.js is already installed
if command -v node &> /dev/null; then
  echo "Node.js is already installed."
  exit 0
fi

# Install Node.js

if [[ "$(uname -s)" == "Darwin" ]]; then
  # macOS
  brew install node
elif [[ -f /etc/redhat-release ]]; then
  # CentOS
  curl --silent --location https://rpm.nodesource.com/setup_18.x | bash -
  yum -y install nodejs
elif [[ -f /etc/lsb-release ]]; then
  # Ubuntu
  curl -sL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
elif [[ "$(uname -s)" == "Windows" ]]; then
  # Windows
  choco install nodejs
else
  echo "Unable to install Node.js. Unknown operating system."
  exit 1
fi

echo "Node.js has been successfully installed."