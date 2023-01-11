#!/bin/sh

# git config --global user.name "CLI-USER"
# git config --global user.email "duynguyen@wearetopgroup.com"
# git config --global user.password "Vodka10012012"

gcloud auth activate-service-account --key-file /usr/diginext-cli/keys/pipeline-service-account.json

gcloud container clusters get-credentials dev1-digitop-vn --zone=asia-southeast1-a --project=top-group-k8s

diginext build