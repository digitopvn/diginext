# Base on offical Node.js Alpine image
FROM  asia.gcr.io/top-group-k8s/framework/diginext:{{base_image_version}}

# Set working directory
WORKDIR /usr/app

# Copy package.json and package-lock.json before other files
# Utilise Docker cache to save re-installing dependencies if unchanged
COPY ./package*.json ./

# Install dependencies
RUN yarn install --production=true
RUN yarn add --dev eslint eslint-config-next

# Delete all files in "pages" directory
RUN rm -rf ./pages/
RUN rm -rf ./plugins/
RUN rm -rf ./components/
RUN rm -rf ./.next/
RUN rm -rf ./next.config.js
RUN rm -rf ./dx.json
RUN rm -rf ./package.json
RUN rm -rf ./package-lock.json

# Copy all files
COPY ./ ./

# Delete env if any
RUN rm -rf ./.env.local
RUN rm -rf ./.env.production
RUN rm -rf ./.env

# Copy ENV file
COPY ./deployment/.env.{{env}} ./.env

# Build app
RUN yarn build

# Expose the listening port
EXPOSE 3000

# Run npm start script when container starts
CMD [ "yarn", "start" ]