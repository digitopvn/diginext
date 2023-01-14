#!/bin/bash

# Check if the plugin is already installed
if gcloud auth list --format='value(account)' | grep -q "gke-gcloud-auth-plugin@system.gserviceaccount.com"; then
  echo "The GKE gcloud auth plugin is already installed."
  exit 0
fi

# Install the GKE gcloud auth plugin

gcloud components install gke-gcloud-auth-plugin

echo "The GKE gcloud auth plugin has been successfully installed."