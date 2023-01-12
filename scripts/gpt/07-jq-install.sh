#!/bin/bash

# Check if jq is already installed
if command -v jq &> /dev/null; then
  echo "jq is already installed."
  exit 0
fi

# Install jq

if [[ "$(uname -s)" == "Darwin" ]]; then
  # macOS
  brew install jq
elif [[ -f /etc/redhat-release ]]; then
  # CentOS
  yum install -y epel-release
  yum install -y jq
elif [[ -f /etc/lsb-release ]]; then
  # Ubuntu
  apt-get update
  apt-get install -y jq
elif [[ "$(uname -s)" == "Windows" ]]; then
  # Windows
  choco install jq
else
  echo "Unable to install jq. Unknown operating system."
  exit 1
fi

echo "jq has been successfully installed."