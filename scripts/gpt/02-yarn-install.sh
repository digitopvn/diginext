#!/bin/bash

# Check if yarn is already installed
if command -v yarn &> /dev/null; then
  echo "yarn is already installed."
  exit 0
fi

# Install yarn

if [[ "$(uname -s)" == "Darwin" ]]; then
  # macOS
  brew install yarn
elif [[ -f /etc/redhat-release ]]; then
  # CentOS
  curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | tee /etc/yum.repos.d/yarn.repo
  yum install yarn
elif [[ -f /etc/lsb-release ]]; then
  # Ubuntu
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
  apt-get update && apt-get install yarn
elif [[ "$(uname -s)" == "Windows" ]]; then
  # Windows
  choco install yarn
else
  echo "Unable to install yarn. Unknown operating system."
  exit 1
fi

echo "yarn has been successfully installed."