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

# TODO: call api to create dxup.dev domain and point it to this server

# Install K3S
curl -sfL https://get.k3s.io | sh -s - --disable=traefik

# Start the MicroK8s cluster
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Install Helm
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod +x get_helm.sh
./get_helm.sh

# Install NGINX Ingress
helm upgrade --install ingress-nginx ingress-nginx --repo https://kubernetes.github.io/ingress-nginx --namespace ingress-nginx --create-namespace

# Install Cert-Manager using Helm
kubectl create ns cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update cert-manager
helm install cert-manager jetstack/cert-manager --namespace cert-manager --version v1.5.3 --set installCRDs=true

# Install Prometheus using Helm
kubectl create ns prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack --namespace prometheus

# Install Grafana using Helm
kubectl create ns grafana
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install grafana grafana/grafana --namespace grafana

# Install Loki using Fluentd
helm repo add loki https://grafana.github.io/loki/charts
helm repo update
helm upgrade --install loki grafana/loki-stack \
  --set fluent-bit.enabled=true,promtail.enabled=false \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=10Gi \
  --set loki.compactor.retention_enabled=true \
  --set loki.limits_config.retention_period=3d

# Create the YAML file for the Cert Manager Prod Let's Encrypt ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: cert@dxup.dev
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Install MongoDB ReplicaSet
# kb create ns mongodb
# helm upgrade --install mongodb -n mongodb \
#   --set architecture=replicaset \
#   --set global.namespaceOverride=mongodb \
#   --set externalAccess.enabled=true \
#   --set auth.rootPassword=iGk8fETzZt bitnami/mongodb

# --- Deploy "hello-world" ---

# create namespace "dev"
kubectl create ns dev

# create deployment "dev"
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev
  namespace: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dev
  template:
    metadata:
      labels:
        app: dev
        project: dev
    spec:
      containers:
        - name: dev
          image: digitop/static:latest
          ports:
            - containerPort: 80
          env:
            - name: NEXT_PUBLIC_ENV
              value: production
EOF

# create service "dev"
kubectl apply -f - <<EOF
---
apiVersion: v1
kind: Service
metadata:
  name: dev
  namespace: dev
  labels:
    app: dev
    project: dev
spec:
  ports:
    - port: 80
      targetPort: 80
  selector:
    app: dev
EOF

# create ingress "dev" (NO HTTPS)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dev-http
  namespace: dev
spec:
  ingressClassName: nginx
  rules:
    - host: microk8s.topane.com
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

# create ingress "dev" (HTTPS)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dev
  namespace: dev
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - demo.topane.com
      secretName: cert-secret-demo-topane-com
  rules:
    - host: demo.topane.com
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
