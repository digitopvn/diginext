# DEBIAN - Base on offical Google Cloud SDK Slim image -> Google Cloud CLI
FROM gcr.io/google.com/cloudsdktool/cloud-sdk:slim

RUN apt-get clean

# Kubernetes Gcloud Authentication plugin
RUN apt-get install google-cloud-sdk-gke-gcloud-auth-plugin

# Node.js, Git, kubectl & Open SSH
RUN apt-get update --allow-releaseinfo-change -yq \
  && apt-get install curl gnupg wget ca-certificates -yq \
  && curl -sL https://deb.nodesource.com/setup_18.x | bash \
  && apt-get install nodejs git sed jq kubectl openssh-client -yq \
  && apt-get clean -y

# Docker Buildx
RUN wget https://github.com/docker/buildx/releases/download/v0.9.1/buildx-v0.9.1.linux-amd64 \
  && chmod a+x buildx-v0.9.1.linux-amd64 \
  && mkdir -p ~/.docker/cli-plugins \
  && mv buildx-v0.9.1.linux-amd64 ~/.docker/cli-plugins/docker-buildx

# Install Digital Ocean CLI
RUN cd ~ \
  && wget https://github.com/digitalocean/doctl/releases/download/v1.78.0/doctl-1.78.0-linux-amd64.tar.gz \
  && tar xf ~/doctl-1.78.0-linux-amd64.tar.gz \
  && mv ~/doctl /usr/local/bin

# Install yarn package manager & pm2
RUN npm install -g yarn

# Set working directory
WORKDIR /usr/diginext-cli

# Copy package.json and package-lock.json before other files
# Utilise Docker cache to save re-installing dependencies if unchanged
COPY ./package*.json ./

# Use yarn 3+
# RUN yarn set version berry

# Install dependencies
RUN touch yarn.lock
RUN yarn install

# RUN yarn add esm

# # Copy all files
# COPY ./ ./

COPY ./dist ./dist
COPY ./scripts ./scripts
COPY ./public ./public
# COPY ./.env ./.env
# COPY ./.env.dev ./.env.dev

# RUN yarn build

# RUN rm -rf src

RUN groupadd docker

RUN usermod -aG docker $(whoami)

# RUN chmod -R +x /usr/diginext-cli/dist
RUN chmod -R +x /usr/diginext-cli/scripts
RUN npm link

EXPOSE 6969

# ENV CLI_MODE=server

# Run npm start script when container starts
# CMD [ "npm", "start" ]
# CMD [ "yarn", "start" ]

# CMD [ "node", "/usr/diginext-cli/dist/server.js" ]

ENTRYPOINT [ "/usr/diginext-cli/scripts/entry.sh" ]

# CMD gcloud version && kubectl version && docker version
# CMD yarn start
# CMD ["sh", "deploy-api.sh"]
# CMD ["bash", "-c", "/usr/diginext-cli/auth.sh", "&&", "node", "/usr/diginext-cli/server.js" ]
# CMD bash -c /usr/diginext-cli/auth.sh && node usr/diginext-cli/server.js
# CMD ["sh", "-c", "chmod 777 /usr/diginext-cli/deploy-api.sh"]