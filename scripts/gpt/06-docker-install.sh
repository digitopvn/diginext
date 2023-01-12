#!/bin/bash

# Check if Docker is already installed
if command -v docker &> /dev/null; then
  echo "Docker is already installed."
  exit 0
fi

# Install Docker

if [[ "$(uname -s)" == "Darwin" ]]; then
  # macOS
  brew cask install docker
elif [[ -f /etc/redhat-release ]]; then
  # CentOS
  yum install -y yum-utils
  yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  yum install -y docker-ce
  systemctl start docker
elif [[ -f /etc/lsb-release ]]; then
  # Ubuntu
  apt-get update
  apt-get install -y apt-transport-https ca-certificates curl software-properties-common
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
  add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
  apt-get update
  apt-get install -y docker-ce
elif [[ "$(uname -s)" == "Windows" ]]; then
  # Windows
  choco install docker
else
  echo "Unable to install Docker. Unknown operating system."
  exit 1
fi

echo "Docker has been successfully installed."