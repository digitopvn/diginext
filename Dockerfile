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

# Set user
USER ${uid}:${gid}

# Copy necessary files
COPY ./dist ./dist
COPY ./public ./public
COPY ./templates ./templates

# RUN chown -R ${uid}:${gid} /usr/app && \
#     chmod -R ug+rwx /usr/app

# Set the entrypoint
ENTRYPOINT ["/usr/app/scripts/startup.sh"]
