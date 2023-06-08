#!/bin/bash

# Function to detect Linux distribution
detect_linux_distribution() {
  if [ -f "/etc/os-release" ]; then
    source "/etc/os-release"
    if [ "${ID}" == "ubuntu" ]; then
      echo "ubuntu"
    elif [ "${ID}" == "centos" ]; then
      echo "centos"
    elif [ "${ID}" == "debian" ]; then
      echo "debian"
    fi
  fi
}

# Detect Linux distribution
linux_distribution=$(detect_linux_distribution)

# Get machine's user & public IP address
export IP_ADDRESS=$(curl ifconfig.me)
export USER=$(whoami)

# check "root" permission
if [ "${linux_distribution}" != "root" ]; then
  echo "Please run this script as 'root'."
  exit 1
fi

# Check if "curl" is already installed
if command -v curl >/dev/null 2>&1; then
  echo "curl is already installed."
else
  # Install "curl" if it's not existed
  if [ "${linux_distribution}" == "ubuntu" ]; then
    sudo apt-get install curl -y
  elif [ "${linux_distribution}" == "centos" ]; then
    sudo yum install curl -y
  elif [ "${linux_distribution}" == "debian" ]; then
    sudo apt-get install curl -y
  else
    echo "Unable to install 'curl': Unsupported Linux distribution."
    exit 1
  fi
fi

# Check if "microk8s" is already installed
if command -v microk8s >/dev/null 2>&1; then
  echo "microk8s is already installed."
else
  # Install MicroK8s based on Linux distribution
  if [ "${linux_distribution}" == "ubuntu" ]; then
    sudo snap install microk8s --classic
  elif [ "${linux_distribution}" == "centos" ]; then
    sudo yum install -y snapd
    sudo systemctl enable --now snapd.socket
    sudo ln -s /var/lib/snapd/snap /snap
    sudo snap install microk8s --classic
  elif [ "${linux_distribution}" == "debian" ]; then
    sudo apt update
    sudo apt install -y snapd
    sudo snap install microk8s --classic
  else
    echo "Unable to install 'microk8s': Unsupported Linux distribution."
    exit 1
  fi
fi

# Enable addons
microk8s enable kubectl dashboard dns ingress metrics-server helm helm3 cert-manager hostpath-storage prometheus

# Install Grafana using Helm
microk8s kubectl create ns grafana
microk8s helm repo add grafana https://grafana.github.io/helm-charts
microk8s helm repo update
microk8s helm install grafana grafana/grafana --namespace grafana

# Install Loki with Fluentd
microk8s helm repo add loki https://grafana.github.io/loki/charts
microk8s helm repo update
microk8s helm upgrade --install loki grafana/loki-stack \
  --set fluent-bit.enabled=true,promtail.enabled=false \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=5Gi \
  --set loki.compactor.retention_enabled=true \
  --set loki.limits_config.retention_period=3d

# Get current ingress class
INGRESS_CLASS=$(kb get ingressclass -o json | jq -r '.items[] | select(.metadata.annotations."ingressclass.kubernetes.io/is-default-class" == "true") | .metadata.name')

# Create the YAML file for the Cert Manager Prod Let's Encrypt ClusterIssuer
microk8s kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: cert@diginext.site
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: $INGRESS_CLASS
EOF

# --- Deploy "hello-world" app ---

# create namespace "hello"
microk8s kubectl create ns hello

# create deployment "hello"
microk8s kubectl -n hello create deployment hello --image=digitop/static --port=80

# expose service "hello"
microk8s kubectl -n hello expose deployment hello

# create ingress "hello" to expose service via
microk8s kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello
  namespace: hello
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hello
            port:
              number: 80
EOF

# create ingress "hello" (HTTPS)
# microk8s kubectl apply -f - <<EOF
# apiVersion: networking.k8s.io/v1
# kind: Ingress
# metadata:
#   name: hello
#   namespace: hello
#   annotations:
#     # kubernetes.io/ingress.class: public
#     cert-manager.io/cluster-issuer: letsencrypt-prod
# spec:
#   tls:
#     - hosts:
#         - microk8s2.topane.com
#       secretName: cert-secret-microk8s2-topane-com
#   rules:
#     - host: microk8s2.topane.com
#       http:
#         paths:
#           - path: /
#             pathType: Prefix
#             backend:
#               service:
#                 name: hello
#                 port:
#                   number: 80
# EOF

echo "Setup completed successfully."
