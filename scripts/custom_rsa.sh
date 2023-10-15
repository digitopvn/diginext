#!/bin/bash

# Check if ID_RSA variable is set and not empty
if [ -n "$ID_RSA" ]; then

    # Ensure ~/.ssh directory exists and is secure
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh

    # Write private key to ~/.ssh/id_rsa and secure it
    echo "$ID_RSA" >~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa

    # Write public key to ~/.ssh/id_rsa.pub
    ssh-keygen -y -f ~/.ssh/id_rsa >>~/.ssh/id_rsa.pub

    # Add bitbucket.org and github.com to known_hosts
    ssh-keyscan bitbucket.org github.com >>~/.ssh/known_hosts
    chmod 644 ~/.ssh/known_hosts

    # Verify SSH Authentication using the specific private key file
    # This will attempt to connect to bitbucket.org using the provided SSH key
    # It's generally considered good practice to use ssh -T to prevent an actual SSH session from being started
    ssh -T git@bitbucket.org

    # Check the exit status of the ssh command
    if [ $? -eq 0 ]; then
        echo "SSH authentication successful!"
    else
        echo -e "\e[31mSSH authentication failed!\e[0m"
    fi
fi
