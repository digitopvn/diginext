FROM nginx

ARG NEXT_PUBLIC_BASE_PATH="{{base_path}}"

COPY build /usr/share/nginx/html/$NEXT_PUBLIC_BASE_PATH
COPY deployment/nginx.conf /etc/nginx/nginx.conf