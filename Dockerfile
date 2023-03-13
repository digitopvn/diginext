# DEBIAN - Base on offical Google Cloud SDK Slim image -> Google Cloud CLI
FROM gcr.io/google.com/cloudsdktool/cloud-sdk:slim

RUN apt-get clean

# Kubernetes Gcloud Authentication plugin
RUN apt-get install google-cloud-sdk-gke-gcloud-auth-plugin

# Node.js, Git, kubectl & Open SSH
RUN apt-get update --allow-releaseinfo-change -yq \
  && apt-get install curl gnupg wget ca-certificates -yq \
  && curl -sL https://deb.nodesource.com/setup_16.x | bash \
  && apt-get install nodejs git sed jq kubectl openssh-client -yq \
  && apt-get autoremove -y \
  && apt-get clean -y

# Helm
RUN curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \
  && chmod 700 get_helm.sh \
  && ./get_helm.sh

# Docker Buildx
RUN wget https://github.com/docker/buildx/releases/download/v0.9.1/buildx-v0.9.1.linux-amd64 \
  && chmod a+x buildx-v0.9.1.linux-amd64 \
  && mkdir -p ~/.docker/cli-plugins \
  && mv buildx-v0.9.1.linux-amd64 ~/.docker/cli-plugins/docker-buildx

# Podman
RUN apt-get -y install podman iptables \
  && apt-get clean -y

# Install Digital Ocean CLI
RUN cd ~ \
  && wget https://github.com/digitalocean/doctl/releases/download/v1.78.0/doctl-1.78.0-linux-amd64.tar.gz \
  && tar xf ~/doctl-1.78.0-linux-amd64.tar.gz \
  && mv ~/doctl /usr/local/bin

# Install PNPM (instead of YARN as the previous version)
# RUN npm install -g yarn
RUN npm install -g pnpm

# Set working directory
WORKDIR /usr/diginext-cli

# Copy package.json and package-lock.json before other files
# Utilise Docker cache to save re-installing dependencies if unchanged
COPY ./package*.json ./

# Use yarn 3+
# RUN yarn set version berry

# Install dependencies
# RUN touch yarn.lock
# RUN yarn install
RUN pnpm i

# RUN yarn add esm

# # Copy all files
# COPY ./ ./

COPY ./dist ./dist
COPY ./scripts ./scripts
COPY ./public ./public
COPY ./templates ./templates
# COPY ./.env ./.env
# COPY ./.env.dev ./.env.dev

# Configuration files for PODMAN to resolve "docker.io" registry shortname alias
COPY ./podman/containers/registries.conf /etc/containers/registries.conf
COPY ./podman/containers/containers.conf /home/cloudsdk/.config/containers/containers.conf

# RUN yarn build

# RUN rm -rf src

RUN groupadd docker
RUN usermod -aG docker $(whoami)
RUN usermod -aG docker cloudsdk

RUN chmod u+x /usr/bin/podman && chown 1000:1000 /usr/bin/podman
RUN touch /etc/sub{u,g}id
RUN usermod --add-subuids 10000-75535 cloudsdk
RUN usermod --add-subgids 10000-75535 cloudsdk
RUN rm -rf /home/cloudsdk/.local/share/containers

# RUN chmod -R +x /usr/diginext-cli/dist
RUN chmod -R +x /usr/diginext-cli/scripts
RUN npm link

ENV _BUILDAH_STARTED_IN_USERNS=""
ENV BUILDAH_ISOLATION=chroot
ENV STORAGE_DRIVER=vfs

EXPOSE 6969

# ENV CLI_MODE=server

# Run npm start script when container starts
# CMD [ "npm", "start" ]
# CMD [ "yarn", "start" ]
# CMD [ "node", "/usr/diginext-cli/dist/server.js" ]

ENTRYPOINT [ "/usr/diginext-cli/scripts/startup.sh" ]

# CMD gcloud version && kubectl version && docker version
# CMD yarn start
# CMD ["sh", "deploy-api.sh"]
# CMD ["bash", "-c", "/usr/diginext-cli/auth.sh", "&&", "node", "/usr/diginext-cli/server.js" ]
# CMD bash -c /usr/diginext-cli/auth.sh && node usr/diginext-cli/server.js
# CMD ["sh", "-c", "chmod 777 /usr/diginext-cli/deploy-api.sh"]