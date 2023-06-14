# Use Debian as the base image
FROM digitop/diginext-base:3

# Set user and group
ARG user=app
ARG group=app
ARG uid=1000
ARG gid=1000
RUN groupadd -g ${gid} ${group} && \
  useradd -u ${uid} -g ${group} -s /bin/sh -m ${user}

# Set working directory
WORKDIR /usr/app

# Copy package.json and package-lock.json before other files
COPY package*.json ./

# Install dependencies
RUN npm i --production

# Copy scripts
COPY ./scripts ./scripts
RUN chmod -R +x /usr/app/scripts

# Permissions
RUN mkdir -p /home/${user}/.config && \
  mkdir -p /home/${user}/.local && \
  chown -R ${uid}:${gid} /home/${user} && \
  chmod -R ug+rwx /home/${user}

# podman storage directory 
RUN mkdir -p /run/user/1000 && chmod 700 /run/user/1000 
RUN chown -R ${uid}:${gid} /run/user/1000 
RUN chmod -R ug+rwx /run/user/1000

# Configuration files for PODMAN to resolve "docker.io" registry shortname alias
COPY ./podman/containers/registries.conf /etc/containers/registries.conf
COPY ./podman/containers/registries.conf /home/${user}/share/containers/registries.conf
COPY ./podman/containers/registries.conf /home/${user}/.config/containers/registries.conf

# PODMAN's image storage
COPY ./podman/containers/storage.conf /home/${user}/share/containers/storage.conf
COPY ./podman/containers/storage.conf /home/${user}/.config/containers/storage.conf
COPY ./podman/containers/storage.conf /root/.config/containers/storage.conf

# PODMAN's container conf
COPY ./podman/containers/containers.conf /etc/containers/containers.conf

RUN chmod -R ug+rwx /home/${user}/.config/containers/storage.conf
RUN mkdir -p /var/tmp/${user}/containers/storage
RUN chown -R ${uid}:${gid} /var/tmp/${user}/containers/storage
RUN chmod -R ug+rwx /var/tmp/${user}/containers/storage

RUN mkdir -p /var/tmp/${user}/containers/storage
RUN chown -R ${uid}:${gid} /var/tmp/${user}/containers/storage

RUN touch /etc/sub{u,g}id
RUN chmod 755 /etc/subuid
RUN chmod 755 /etc/subgid

# Copy necessary files
COPY ./dist ./dist
COPY ./public ./public
COPY ./templates ./templates

RUN chown -R ${uid}:${gid} /usr/app && \
  chmod -R ug+rwx /usr/app

# Set user
ENV USER=${user}
USER ${uid}:${gid}

# Set the entrypoint
ENTRYPOINT ["/usr/app/scripts/startup.sh"]
