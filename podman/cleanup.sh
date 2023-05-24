#!/bin/bash

# Usage [1]: ./cleanup.sh 72 hours
# Usage [2]: ./cleanup.sh 7 days

# Check if the time threshold argument is provided
if [[ -z $1 ]]; then
    echo "Error: Time threshold not specified."
    echo "Usage: ./cleanup.sh <time_threshold> <time_unit>"
    exit 1
fi

# Check if the time unit argument is provided
if [[ -z $2 ]]; then
    echo "Error: Time unit not specified."
    echo "Usage: ./cleanup.sh <time_threshold> <time_unit>"
    exit 1
fi

# Check if the time unit is hours or days
if [[ $2 != "hours" && $2 != "days" ]]; then
    echo "Error: Invalid time unit. Use 'hours' or 'days'."
    echo "Usage: ./cleanup.sh <time_threshold> <time_unit>"
    exit 1
fi

# Calculate the timestamp threshold
if [[ $2 == "hours" ]]; then
    threshold=$(date -d "-$1 hours" +%s)
else
    threshold=$(date -d "-$1 days" +%s)
fi

# Get all container IDs and their creation timestamps
containers=$(podman ps -aq --format "{{.ID}} {{.CreatedAt}}")

# Iterate over the containers
while read -r container; do
    container_id=$(echo "$container" | awk '{print $1}')
    created_time=$(echo "$container" | awk '{print $2}')
    created_timestamp=$(date -d "$created_time" +%s)

    # Check if the container is older than the threshold
    if [[ $created_timestamp -lt $threshold ]]; then
        # Stop and remove the container
        podman stop "$container_id" && podman rm "$container_id"
    fi
done <<<"$containers"
