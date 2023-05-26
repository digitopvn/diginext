# Use Debian as the base image
FROM debian:latest as builder

# Switch to "root" user
USER root

# Install build dependencies
RUN apt-get update && apt-get install -y curl wget git sed jq openssh-client

# Upgrade Node.js to version 16.x
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

# Install GCLOUD CLI / SDK
RUN apt-get install -y apt-transport-https ca-certificates gnupg lsb-release && \
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - && \
    apt-get update && apt-get install -y google-cloud-sdk

# Install KUBECTL
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv ./kubectl /usr/bin/kubectl

# Install Kubernetes Gcloud Authentication plugin
RUN apt-get install -y google-cloud-sdk-gke-gcloud-auth-plugin

# Install Helm
RUN curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 && \
    chmod 700 get_helm.sh && \
    ./get_helm.sh

# Install Docker
RUN apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose

# Install Podman
RUN apt-get install -y podman iptables

# Install Digital Ocean CLI
RUN cd ~ && \
    wget https://github.com/digitalocean/doctl/releases/download/v1.78.0/doctl-1.78.0-linux-amd64.tar.gz && \
    tar xf doctl-1.78.0-linux-amd64.tar.gz && \
    mv ~/doctl /usr/local/bin/doctl

# Set working directory
WORKDIR /usr/app

# Copy package.json and package-lock.json before other files
COPY package*.json ./
# COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm i

# Copy necessary files
COPY ./dist ./dist
COPY ./scripts ./scripts
COPY ./public ./public
COPY ./templates ./templates

# Intermediate stage for permissions and final image
FROM debian:latest

# WORKDIR /usr/app

# Set user and group
ARG user=app
ARG group=app
ARG uid=1000
ARG gid=1000
RUN groupadd -g ${gid} ${group} && \
    useradd -u ${uid} -g ${group} -s /bin/sh -m ${user}

# Copy installed binaries and dependencies from builder stage
COPY --from=builder /usr/bin/ssh-keygen /usr/bin/ssh-keygen
COPY --from=builder /usr/bin/git /usr/bin/git
COPY --from=builder /usr/local /usr/local
COPY --from=builder /usr/bin/kubectl /usr/bin/kubectl
COPY --from=builder /usr/app /usr/app

# Copy Node.js from the builder stage
COPY --from=builder /usr/bin/node /usr/bin/node
COPY --from=builder /usr/include/node /usr/include/node
COPY --from=builder /usr/lib/node_modules /usr/lib/node_modules

# Copy docker buildx
COPY --from=docker/buildx-bin /buildx /usr/local/bin/docker-buildx

# Set permissions for the binary
RUN chmod +x /usr/local/bin/docker-buildx

# Permissions
RUN chmod -R +x /usr/app/scripts && \
    mkdir -p /home/${user}/.config && \
    mkdir -p /home/${user}/.local && \
    chown -R ${uid}:${gid} /home/${user} && \
    chmod -R ug+rwx /home/${user}

# Set user
USER ${uid}:${gid}
WORKDIR /usr/app

# Set the entrypoint
ENTRYPOINT ["/usr/app/scripts/startup.sh"]
