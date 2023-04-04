FROM nginx

ARG NEXT_PUBLIC_BASE_PATH="{{base_path}}"

COPY build /usr/share/nginx/html/$NEXT_PUBLIC_BASE_PATH
COPY nginx.conf /etc/nginx/nginx.conf