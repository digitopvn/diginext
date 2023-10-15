#!/bin/bash

# create some helpful aliases
alias ll="ls -al"

# Check if ID_RSA variable is set and not empty
# ./custom_rsa.sh

# Start the app...
export CLI_MODE=server
node /usr/app/dist/server.js
