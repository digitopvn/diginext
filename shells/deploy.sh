#!/bin/bash

set -e 
set -o pipefail

GCLOUD_DOCKER_GCR_URL=asia.gcr.io

echo "GKE_PROJECT_ID=$GKE_PROJECT_ID"
echo "GKE_CLUSTER_NAME=$GKE_CLUSTER_NAME"
echo "GKE_CLOUD_ZONE=$GKE_CLOUD_ZONE"
echo "APP_NAME=$APP_NAME"
echo "IMAGE_NAME=$IMAGE_NAME"
echo "DOCKER_FILE=$DOCKER_FILE"
echo "DEPLOYMENT_FILE=$DEPLOYMENT_FILE"
echo "GCLOUD_DOCKER_GCR_URL=$GCLOUD_DOCKER_GCR_URL"
# echo "PIPELINE_SA_PATH=$PIPELINE_SA_PATH"

echo $SERVICE_ACCOUNT > /usr/diginext-cli/gcloud-service-account.json
SERVICE_ACCOUNT_PATH=/usr/diginext-cli/gcloud-service-account.json

gcloud auth activate-service-account --key-file $SERVICE_ACCOUNT_PATH
gcloud container clusters get-credentials $GKE_CLUSTER_NAME --zone=$GKE_CLOUD_ZONE --project=$GKE_PROJECT_ID

docker login -u _json_key --password-stdin https://$GCLOUD_DOCKER_GCR_URL < $SERVICE_ACCOUNT_PATH
docker build -t $IMAGE_NAME -f $DOCKER_FILE .
docker push $IMAGE_NAME

# replace {{image_name}} with IMAGE_NAME
sed -i "s|{{image_name}}|$IMAGE_NAME|g" $DEPLOYMENT_FILE

echo "$(<$DEPLOYMENT_FILE)"

kubectl apply -f $DEPLOYMENT_FILE

# restore {{image_name}} for the next deploy
sed -i "s|$IMAGE_NAME|{{image_name}}|g" $DEPLOYMENT_FILE