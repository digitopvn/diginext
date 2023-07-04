# Why PODMAN over DOCKER?

Diginext uses both PODMAN & DOCKER to build your application.

For simple installation, we usually like to spin up the Diginext build server with Docker / Docker Compose or Kubernetes, this is the concept of [Docker-in-Docker](https://www.docker.com/blog/docker-can-now-run-within-docker/), Docker Engine requires deamonset to build your image, therefor you need to run the container as `root` user with `privileged` mode & also mount `docker.sock` volume. Running a container in `privileged` mode is a bad practice since it would lead to security issue (if you don't know this, [read here](https://www.trendmicro.com/en_us/research/19/l/why-running-a-privileged-container-in-docker-is-a-bad-idea.html)).

On the other hand, [Podman](https://podman.io/) is a daemonless container engine for developing, managing, and running OCI Containers. Containers can either be run as `root` or in `rootless` mode. Podman also has similar commands with Docker, so it would be simpler to implement into **Diginext**.

**__Notes:__** there is a bit of tradeoff when using Podman instead of Docker as a builder - build speed. You will notice a slightly increase build time when using Podman, however, I would make it as an acceptance rather facing any potential risks in the future.