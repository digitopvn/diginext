#!/bin/bash

set -e

red=$(tput setaf 1)
green=$(tput setaf 2)
reset=$(tput sgr0)

# Config vars:
PACKAGE_PATH=./package.json
PACKAGE_CONTENT=$(cat $PACKAGE_PATH 2>/dev/null)
PACKAGE_VERSION=$(jq -r '.version' <<<$PACKAGE_CONTENT)
GCLOUD_DOCKER_GCR_URL=asia.gcr.io
SERVICE_ACCOUNT_PATH=./keys/gcloud-service-account.json

git fetch --all
git merge master

# check beta:
IFS='-' read -ra VARRAY <<<"$PACKAGE_VERSION"
if [[ ${VARRAY[1]} = "beta" ]]; then
    echo "${red}[ERROR] Bạn cần chỉnh version lại không có 'beta' trong 'package.json' trước.${reset}"
    exit
fi

VERSION=$(jq -r '.version' <<<$PACKAGE_CONTENT)
GIT_TAG_VERSION="v${VERSION}"
IMAGE_NAME="${GCLOUD_DOCKER_GCR_URL}/top-group-k8s/framework/diginext-cli"
DOCKER_IMAGE_PATH="$IMAGE_NAME:$VERSION"

echo "--------------------------------------"
echo "PRODUCTION Releasing:"
echo "--------------------------------------"
echo "- Version: $VERSION"
echo "- Git tag: $GIT_TAG_VERSION"
echo "- Image name: $IMAGE_NAME"
echo "--------------------------------------"

git_tag_push_origin() {
    # delete old tag:
    git tag -d $GIT_TAG_VERSION
    git push origin :refs/tags/$GIT_TAG_VERSION
}

# Build docker image:
if [ ! -f $SERVICE_ACCOUNT_PATH ]; then
    echo "Không tìm thấy thông tin truy cập GCloud Container Registry, vui lòng liên hệ ADMIN <duy@wearetopgroup.com>!"
fi

docker login -u _json_key --password-stdin https://$GCLOUD_DOCKER_GCR_URL <$SERVICE_ACCOUNT_PATH
docker build --platform=linux/x86_64 -t $IMAGE_NAME":latest" -t $DOCKER_IMAGE_PATH -f Dockerfile .
docker push $DOCKER_IMAGE_PATH
docker push $IMAGE_NAME":latest"

# Tag new version & push origin
git_tag_push_origin || true

# tag new version:
git tag $GIT_TAG_VERSION
git push --force origin refs/tags/"$GIT_TAG_VERSION":refs/tags/"$GIT_TAG_VERSION"

# Create pull request of changes to "master":
diginext git pr --merge
