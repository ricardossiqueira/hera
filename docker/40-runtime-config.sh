#!/bin/sh
set -eu

config_file=/usr/share/nginx/html/runtime-config.js
proxy_file=/etc/nginx/conf.d/api-proxy.inc
upstream=${HESTIA_UPSTREAM_URL:-}
if [ -n "$upstream" ]; then
  case "$upstream" in
    http://*|https://*) ;;
    *) echo 'HESTIA_UPSTREAM_URL must be an HTTP(S) URL' >&2; exit 1 ;;
  esac
  upstream=${upstream%/}
  cat > "$proxy_file" <<EOF
location /api/ {
    proxy_pass $upstream/;
    proxy_set_header Host \$http_host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cookie_path / /api;
}
EOF
  gateway_url=${VITE_GATEWAY_URL:-/api}
  gateway_api_base_url=${VITE_GATEWAY_API_BASE_URL:-/api}
else
  printf 'location /api/ { return 503; }\n' > "$proxy_file"
  gateway_url=${VITE_GATEWAY_URL:-}
  gateway_api_base_url=${VITE_GATEWAY_API_BASE_URL:-}
fi
printf 'window.__HERA_CONFIG__ = ' > "$config_file"
jq -cn \
  --arg gatewayApiBaseUrl "$gateway_api_base_url" \
  --arg gatewayUrl "$gateway_url" \
  '{gatewayApiBaseUrl: $gatewayApiBaseUrl, gatewayUrl: $gatewayUrl}' >> "$config_file"
printf ';\n' >> "$config_file"
