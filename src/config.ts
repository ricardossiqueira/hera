type GatewayEnvironmentKey = "VITE_GATEWAY_API_BASE_URL" | "VITE_GATEWAY_URL";

function configuredValue(runtimeValue: string | undefined, environmentKey: GatewayEnvironmentKey) {
  const value = runtimeValue?.trim() || import.meta.env[environmentKey]?.trim();
  return value || undefined;
}

export function getGatewayApiBaseUrl() {
  return configuredValue(window.__HERA_CONFIG__?.gatewayApiBaseUrl, "VITE_GATEWAY_API_BASE_URL");
}

export function getGatewayUrl() {
  return configuredValue(window.__HERA_CONFIG__?.gatewayUrl, "VITE_GATEWAY_URL");
}
