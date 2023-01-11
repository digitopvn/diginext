#!/bin/bash

set -e
# set -o pipefail

export GCLOUD_DOCKER_GCR_URL=asia.gcr.io
export SERVICE_ACCOUNT_PATH=/usr/diginext-cli/keys/gcloud-service-account.json

chmod -R 755 $SERVICE_ACCOUNT_PATH

echo "GCLOUD_DOCKER_GCR_URL=$GCLOUD_DOCKER_GCR_URL"

# Authenticate Bitbucket:
chmod -R 400 /usr/diginext-cli/keys/id_rsa

# ls /keys
eval `ssh-agent -s`
ssh-add /usr/diginext-cli/keys/id_rsa

mkdir ~/.ssh
touch ~/.ssh/known_hosts
ssh-keyscan bitbucket.org >> ~/.ssh/known_hosts

touch ~/.ssh/config
echo "Host bitbucket.org \n
IdentityFile /usr/diginext-cli/keys/id_rsa" >> ~/.ssh/config

ssh -T git@bitbucket.org

# GCLOUD AUTH
# gcloud components install gke-gcloud-auth-plugin
export USE_GKE_GCLOUD_AUTH_PLUGIN=True
# gcloud components update
gcloud auth activate-service-account --key-file $SERVICE_ACCOUNT_PATH

# DIGITAL OCEAN AUTH
API_ACCESS_TOKEN=dop_v1_acbf9e06d43ff2131c97da202b1ea2cde7b6ea41439d80a4d841c85353310d62
doctl auth init -t $API_ACCESS_TOKEN

# DOCKER AUTH -> GOOGLE CONTAINER REGISTRY
gcloud auth configure-docker $GCLOUD_DOCKER_GCR_URL --quiet
# docker login -u _json_key --password-stdin https://$GCLOUD_DOCKER_GCR_URL <$SERVICE_ACCOUNT_PATH
