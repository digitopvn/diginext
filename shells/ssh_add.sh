#!/bin/bash

eval `ssh-agent -s`
ssh-add -K $1