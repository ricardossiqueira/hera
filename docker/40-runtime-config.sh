#!/bin/sh
set -eu

config_file=/usr/share/nginx/html/runtime-config.js
printf 'window.__HERA_CONFIG__ = ' > "$config_file"
jq -cn \
  --arg gatewayApiBaseUrl "${VITE_GATEWAY_API_BASE_URL:-}" \
  --arg gatewayUrl "${VITE_GATEWAY_URL:-}" \
  '{gatewayApiBaseUrl: $gatewayApiBaseUrl, gatewayUrl: $gatewayUrl}' >> "$config_file"
printf ';\n' >> "$config_file"
