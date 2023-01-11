# ===================================
#       PHASE 1 - BUILDER
# ===================================

FROM node:17.4.0-alpine AS BUILD_IMAGE

ENV NODE_OPTIONS=--max_old_space_size=8192

# Because ALPINE base image don't have python pre-installed 
RUN apk update && apk add bash curl python3 make g++ && rm -rf /var/cache/apk/*

# install node-prune (https://github.com/tj/node-prune)
RUN curl -sf https://gobinaries.com/tj/node-prune | sh

WORKDIR /usr/app

COPY package.json .
COPY turbo.json .
COPY .yarnrc.yaml .

COPY ./apps/diginext/package.json ./apps/diginext/package.json

# packages
COPY ./packages ./packages

# install the packages & dependencies
RUN yarn set version berry

# remove unneccessary packages
COPY ./tools/remove-package-not-using ./tools/remove-package-not-using
RUN cd ./tools/remove-package-not-using && npm install && npm run startup

# Only install production packages
# RUN yarn workspaces focus --all --production
RUN echo "" >> yarn.lock
RUN yarn

# apps
COPY ./apps/diginext ./apps/diginext
COPY ./apps/diginext/deployment/.env.dev ./apps/diginext/.env

# Start building
RUN yarn build:diginext

# Remove cache directory of "turbo" -> lighter docker image:
RUN rm -rf ./node_modules/.cache

# run node-prune to scan for other unused node_modules packages
RUN /usr/local/bin/node-prune

# ===================================
#       PHASE 2 - RUNNER
# ===================================

FROM node:17.4.0-alpine AS RUNNER

WORKDIR /usr/app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Only copy build files & neccessary files to run:
COPY --from=BUILD_IMAGE --chown=nextjs:nodejs /usr/app/apps/diginext/next.config.js .
COPY --from=BUILD_IMAGE --chown=nextjs:nodejs /usr/app/apps/diginext/.next/standalone .
COPY --from=BUILD_IMAGE --chown=nextjs:nodejs /usr/app/apps/diginext/.next/static ./.next/static
COPY --from=BUILD_IMAGE --chown=nextjs:nodejs /usr/app/apps/diginext/public ./public
COPY --from=BUILD_IMAGE --chown=nextjs:nodejs /usr/app/node_modules ./node_modules
# COPY --from=BUILD_IMAGE --chown=nextjs:nodejs /usr/app/apps/diginext/next-i18next.config.js .
COPY --from=BUILD_IMAGE --chown=nextjs:nodejs /usr/app/apps/diginext/.env .

EXPOSE 3000 80

CMD node server.js

