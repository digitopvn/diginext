#!/bin/bash
set -e
set -o noglob

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
if [ "${USER}" != "root" ]; then
  echo "Please run this script as 'root' user."
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
microk8s enable dashboard
microk8s enable dns
microk8s enable ingress
microk8s enable metrics-server
microk8s enable helm
microk8s enable helm3
microk8s enable cert-manager
microk8s enable hostpath-storage
microk8s enable prometheus

# Install Grafana using Helm
# microk8s kubectl create ns grafana
# microk8s helm repo add grafana https://grafana.github.io/helm-charts
# microk8s helm repo update
# microk8s helm install grafana grafana/grafana --namespace grafana

# Install Loki with Fluentd
# microk8s helm repo add loki https://grafana.github.io/loki/charts
# microk8s helm repo update
# microk8s helm upgrade --install loki grafana/loki-stack \
#   --set fluent-bit.enabled=true,promtail.enabled=false \
#   --set loki.persistence.enabled=true \
#   --set loki.persistence.size=5Gi \
#   --set loki.compactor.retention_enabled=true \
#   --set loki.limits_config.retention_period=3d

# Get current ingress class
INGRESS_CLASS=$(microk8s kubectl get ingressclass -o json | jq -r '.items[] | select(.metadata.annotations."ingressclass.kubernetes.io/is-default-class" == "true") | .metadata.name')

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

microk8s kubectl -n hello get all,ing -o wide

curl http://localhost:80

# Install MongoDB using Helm
MONGODB_NAMESPACE=mongodb
MONGODB_STATEFULSET_NAME=mongodb
MONGODB_ROOT_PW=diginext
MONGODB_URI=mongodb://root:${MONGODB_ROOT_PW}@mongodb.mongodb:27017/diginext?authSource=admin

microk8s kubectl create ns $MONGODB_NAMESPACE
microk8s helm upgrade --install $MONGODB_STATEFULSET_NAME -n $MONGODB_NAMESPACE \
  --set architecture=replicaset \
  --set global.namespaceOverride=$MONGODB_NAMESPACE \
  --set auth.rootPassword=$MONGODB_ROOT_PW \
  oci://registry-1.docker.io/bitnamicharts/mongodb

# Check if the MongoDB StatefulSet is ready
is_statefulset_ready() {
  kubectl get statefulset "$MONGODB_STATEFULSET_NAME" -n "$MONGODB_NAMESPACE" -ojsonpath='{.status.readyReplicas}' | grep -q "$(kubectl get statefulset "$MONGODB_STATEFULSET_NAME" -n "$MONGODB_NAMESPACE" -ojsonpath='{.status.replicas}')"
}

# Wait for the StatefulSet to be ready
while ! is_statefulset_ready; do
  echo "Waiting for the StatefulSet to be ready..."
  sleep 5
done

echo "MongoDB is fully ready."

# ----- Deploy Diginext -----

export KUBECONFIG=$(microk8s config)
export INITIAL_CLUSTER_URL=http://${IP_ADDRESS}:6969

# Deploy "FUSE Drive" plugin
microk8s kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fuse-device-plugin-daemonset
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: fuse-device-plugin-ds
  template:
    metadata:
      labels:
        name: fuse-device-plugin-ds
    spec:
      hostNetwork: true
      containers:
      - image: soolaugust/fuse-device-plugin:v1.0
        name: fuse-device-plugin-ctr
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
        volumeMounts:
          - name: device-plugin
            mountPath: /var/lib/kubelet/device-plugins
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
      imagePullSecrets:
        - name: registry-secret
EOF

# Deploy "Diginext" server
microk8s kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: diginext
---
# INGRESS CONFIGURATION
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: diginext
  namespace: diginext
  labels:
    project: diginext
    owner: topgroup
  annotations:
    nginx.ingress.kubernetes.io/enable-underscores-in-headers: "true"
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: diginext
                port:
                  number: 6969
---
# SERVICE CONFIGURATION
apiVersion: v1
kind: Service
metadata:
  name: diginext
  namespace: diginext
  labels:
    app: diginext
    project: diginext
    owner: topgroup
spec:
  ports:
    - port: 6969
  selector:
    app: diginext
---
# POD DEPLOYMENT CONFIGURATION
apiVersion: apps/v1
kind: Deployment
metadata:
  name: diginext
  namespace: diginext
  labels:
    project: diginext
    owner: topgroup
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: diginext
  template:
    metadata:
      labels:
        owner: topgroup
        app: diginext
        project: diginext
    spec:
      containers:
        - name: diginext
          image: digitop/diginext:latest
          ports:
            - containerPort: 6969
          # Security for PODMAN to run in rootless mode
          securityContext:
            privileged: true
            runAsUser: 1000
            runAsGroup: 1000
          # Required for PODMAN to run (kubectl apply -f 05-podman-fuse-device-plugin.yaml)
          resources:
            limits:
              github.com/fuse: 1
          env:
            - name: TZ
              value: Asia/Ho_Chi_Minh
            - name: PORT
              value: "6969"
            - name: NODE_ENV
              value: production
            - name: CLI_MODE
              value: server
            - name: DEV_MODE
              value: "false"
            - name: BASE_URL
              value: ${INITIAL_CLUSTER_URL}
            - name: DB_NAME
              value: diginext
            - name: DB_URI
              value: ${MONGODB_URI}
            - name: INITIAL_CLUSTER_KUBECONFIG
              value: ${KUBECONFIG}
          volumeMounts:
            - name: storage
              mountPath: /usr/app/storage
            - name: logs
              mountPath: /usr/app/public/logs
            - name: home
              mountPath: /home/app
      volumes:
        - name: storage
          emptyDir: {}
        - name: logs
          emptyDir: {}
        - name: home
          emptyDir: {}
EOF

echo "MicroK8S Cluster has been set up successfully."
