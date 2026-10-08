import { afterEach, describe, expect, it, vi } from "vitest";
import { getGatewayApiBaseUrl, getGatewayUrl } from "./config";

afterEach(() => {
  delete window.__HERA_CONFIG__;
  vi.unstubAllEnvs();
});

describe("runtime gateway configuration", () => {
  it("prefers the container-provided URLs over Vite build values", () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://build-gateway.local:8082");
    vi.stubEnv("VITE_GATEWAY_URL", "http://build-gateway.local:8082");
    window.__HERA_CONFIG__ = {
      gatewayApiBaseUrl: " http://runtime-gateway.local:8082/ ",
      gatewayUrl: " http://runtime-gateway.local:8082/ ",
    };

    expect(getGatewayApiBaseUrl()).toBe("http://runtime-gateway.local:8082/");
    expect(getGatewayUrl()).toBe("http://runtime-gateway.local:8082/");
  });

  it("falls back to Vite environment values when runtime values are empty", () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://build-gateway.local:8082");
    vi.stubEnv("VITE_GATEWAY_URL", "http://build-gateway.local:8082");
    window.__HERA_CONFIG__ = { gatewayApiBaseUrl: " ", gatewayUrl: "" };

    expect(getGatewayApiBaseUrl()).toBe("http://build-gateway.local:8082");
    expect(getGatewayUrl()).toBe("http://build-gateway.local:8082");
  });
});
