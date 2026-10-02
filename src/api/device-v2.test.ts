import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DevicePlatformApiError,
  createAutomationRuleV2,
  getDeviceTelemetryV2,
  getDeviceV2,
  listAutomationRulesV2,
  listDevicesV2,
  listDiscoveryV2,
  registerDiscoveredDeviceV2,
} from "./device-v2";
import { clearCredentials, setCredentials } from "./auth";

afterEach(() => { clearCredentials(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("device-v2 API contract", () => {
  it("uses fixtures only when development mocks are explicitly enabled", async () => {
    vi.stubEnv("VITE_DEVICE_V2_MOCKS", "true");
    const entries = await listDiscoveryV2();
    expect(entries).toEqual(expect.arrayContaining([expect.objectContaining({ deviceUid: "esp32c3-42a9", manifest: expect.objectContaining({ schema_version: 2 }) })]));
    await expect(registerDiscoveredDeviceV2("esp32c3-42a9", "led-novo")).resolves.toMatchObject({ device: { deviceId: "led-novo", activeState: "active" }, steps: expect.arrayContaining([expect.objectContaining({ id: "activation", status: "complete" })]) });
    await expect(getDeviceTelemetryV2("orangepi-monitor")).resolves.toMatchObject({ available: true, fields: expect.objectContaining({ cpu_pct: 12.5 }) });
    await expect(getDeviceTelemetryV2("led-novo")).resolves.toEqual({ available: false });
  });

  it("uses VITE_GATEWAY_URL and POST for every remote v2 RPC without exposing MQTT credentials", async () => {
    vi.stubEnv("VITE_DEVICE_V2_MOCKS", "false");
    vi.stubEnv("VITE_GATEWAY_URL", "http://gateway.local:8082/");
    const rule = { id: "r1", enabled: true, trigger: { sourceDeviceId: "source", outputChannel: "telemetry" as const }, action: { targetDeviceId: "target", commandType: "render", parameters: {} }, updatedAt: "2026-10-01T00:00:00Z" };
    const responses: Record<string, unknown> = {
      ListDiscovery: { entries: [] },
      RegisterDiscoveredDevice: { device: { deviceId: "led-novo" }, steps: [] },
      ListDevices: { devices: [] },
      GetDevice: { deviceId: "led-novo" },
      ListAutomationRules: { rules: [] },
      CreateAutomationRule: { rule },
      GetDeviceTelemetry: { available: true, fields: { cpu_pct: 12.5 }, timestamp: "2026-10-01T12:00:00Z", messageId: "msg-1" },
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = url.slice(url.lastIndexOf("/") + 1);
      return Promise.resolve(new Response(JSON.stringify(responses[method]), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    await listDiscoveryV2();
    await registerDiscoveredDeviceV2("uid-1", "led-novo");
    await listDevicesV2();
    await getDeviceV2("led-novo");
    await listAutomationRulesV2();
    await getDeviceTelemetryV2("led-novo");
    await expect(createAutomationRuleV2(rule)).resolves.toEqual(rule);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toMatch(/^http:\/\/gateway\.local:8082\/iot\.gateway\.api\.v2\.DevicePlatformService\//);
      expect(options).toEqual(expect.objectContaining({ method: "POST", credentials: "include", headers: expect.objectContaining({ "Content-Type": "application/json" }) }));
      expect(JSON.stringify(options)).not.toContain("password");
    }
    expect(fetchMock).toHaveBeenLastCalledWith("http://gateway.local:8082/iot.gateway.api.v2.DevicePlatformService/CreateAutomationRule", expect.objectContaining({ body: JSON.stringify({ rule }) }));
  });

  it("fails clearly instead of silently switching to fixtures when no Gateway URL is configured", async () => {
    vi.stubEnv("VITE_DEVICE_V2_MOCKS", "false");
    vi.stubEnv("VITE_GATEWAY_URL", "");
    await expect(listDiscoveryV2()).rejects.toMatchObject({ name: "DevicePlatformApiError", message: expect.stringContaining("VITE_GATEWAY_URL") });
  });

  it("normalizes HTTP, authentication and transport failures from the Gateway", async () => {
    vi.stubEnv("VITE_DEVICE_V2_MOCKS", "false");
    vi.stubEnv("VITE_GATEWAY_URL", "http://gateway.local:8082");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ message: "discovery is unavailable" }), { status: 503 })));
    await expect(listDiscoveryV2()).rejects.toMatchObject({ name: "DevicePlatformApiError", message: "discovery is unavailable", status: 503 });

    setCredentials("operator", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ message: "unauthorized" }), { status: 401 })));
    await expect(listDiscoveryV2()).rejects.toMatchObject({ name: "DevicePlatformApiError", message: expect.stringContaining("Autenticação"), status: 401 });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("network down")));
    await expect(listDiscoveryV2()).rejects.toBeInstanceOf(DevicePlatformApiError);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("not-json", { status: 200 })));
    await expect(listDiscoveryV2()).rejects.toMatchObject({ name: "DevicePlatformApiError", message: expect.stringContaining("JSON inválida"), status: 200 });
  });
});
