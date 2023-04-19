#!/bin/bash

echo "EXECUTING START-UP SCRIPT IN DEVELOPMENT"

# Set the default port to 6969
PORT=${PORT:-6969}

# Wait until the app is ready
# while ! nc -z localhost "$PORT"; do
#     sleep 1
# done

# Check if NODE_ENV is "test" and run the "test" script if it is
if [ "$NODE_ENV" = "test" ]; then
    npm run test
else
    # Run the dev server
    pnpm dev:server
fi
