#!/bin/bash

# Check if gcloud is already installed
if command -v gcloud &> /dev/null; then
  echo "gcloud is already installed."
  exit 0
fi

# Install gcloud sdk

if [[ "$(uname -s)" == "Darwin" ]]; then
  # macOS
  brew cask install google-cloud-sdk
elif [[ -f /etc/redhat-release ]]; then
  # CentOS
  export CLOUD_SDK_REPO="cloud-sdk-$(lsb_release -c -s)"
  echo "deb http://packages.cloud.google.com/apt $CLOUD_SDK_REPO main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
  curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
  apt-get update && apt-get install google-cloud-sdk
elif [[ -f /etc/lsb-release ]]; then
  # Ubuntu
  export CLOUD_SDK_REPO="cloud-sdk-$(lsb_release -c -s)"
  echo "deb http://packages.cloud.google.com/apt $CLOUD_SDK_REPO main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
  curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
  apt-get update && apt-get install google-cloud-sdk
elif [[ "$(uname -s)" == "Windows" ]]; then
  # Windows
  choco install google-cloud-sdk
else
  echo "Unable to install gcloud. Unknown operating system."
  exit 1
fi

echo "gcloud has been successfully installed."