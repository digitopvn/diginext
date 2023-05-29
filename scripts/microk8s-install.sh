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

# TODO: call api to create diginext.site domain and point it to this server

# Install MicroK8S
snap install microk8s --classic

# Enable addons
microk8s enable kubectl dashboard dns ingress metrics-server helm helm3 cert-manager hostpath-storage prometheus

# Install Grafana using Helm
microk8s kubectl create ns grafana
microk8s helm repo add grafana https://grafana.github.io/helm-charts
microk8s helm repo update
microk8s helm install grafana grafana/grafana --namespace grafana

# Install Loki using Fluentd
microk8s helm repo add loki https://grafana.github.io/loki/charts
microk8s helm repo update
microk8s helm upgrade --install loki grafana/loki-stack \
    --set fluent-bit.enabled=true,promtail.enabled=false \
    --set loki.persistence.enabled=true \
    --set loki.persistence.size=10Gi \
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

# --- Deploy "hello-world" ---

# create namespace "dev"
microk8s kubectl create ns dev

# create deployment "dev"
microk8s kubectl -n dev create deployment dev --image=digitop/static --port=80

# expose service "dev"
microk8s kubectl -n dev expose deployment dev

# create ingress "dev" (HTTPS)
microk8s kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dev
  namespace: dev
  annotations:
    # kubernetes.io/ingress.class: public
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - microk8s2.topane.com
      secretName: cert-secret-microk8s2-topane-com
  rules:
    - host: microk8s2.topane.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dev
                port:
                  number: 80
EOF

echo "Setup completed successfully."