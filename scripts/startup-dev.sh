#!/bin/bash

# CLI_MODE=client dx git ssh register --provider bitbucket

# /usr/diginext-cli/shells/auth.sh

echo "HELLOOOOOOOO"

chmod +rw pnpm-lock.yaml \
    .babelrc.js \
    .eslintignore \
    .eslintrc \
    .prettierignore \
    .prettierrc.json \
    commitlint.config.js \
    lint-staged.config.js \
    tsconfig.json \
    tsoa.json

pnpm i
pnpm dev
