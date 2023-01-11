#FROM node:12.13-alpine
FROM mhart/alpine-node:14.17.3

# Set working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
COPY yarn*.lock ./

# Install node_modules
RUN yarn install --only=production

# Copy existing application directory contents
COPY . .

# Copy ENV file
COPY ./deployment/.env.{{env}} ./.env

EXPOSE 80
CMD [ "yarn", "start" ]
