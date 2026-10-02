import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutomationRuleV2, listDiscoveryV2, registerDiscoveredDeviceV2 } from "./device-v2";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("device-v2 API contract", () => {
  it("uses fixtures without a gateway URL, allowing the Web front to evolve independently", async () => {
    vi.stubEnv("VITE_DEVICE_V2_MOCKS", "true");
    const entries = await listDiscoveryV2();
    expect(entries).toEqual(expect.arrayContaining([expect.objectContaining({ deviceUid: "esp32c3-42a9", manifest: expect.objectContaining({ schema_version: 2 }) })]));
    await expect(registerDiscoveredDeviceV2("esp32c3-42a9", "led-novo")).resolves.toMatchObject({ device: { deviceId: "led-novo", activeState: "active" }, steps: expect.arrayContaining([expect.objectContaining({ id: "activation", status: "complete" })]) });
  });

  it("calls the provisional v2 RPC without exposing MQTT credentials", async () => {
    vi.stubEnv("VITE_DEVICE_V2_MOCKS", "false");
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082/");
    const rule = { id: "r1", enabled: true, trigger: { sourceDeviceId: "source", outputChannel: "telemetry" as const }, action: { targetDeviceId: "target", commandType: "render", parameters: {} }, updatedAt: "2026-10-01T00:00:00Z" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ rule }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(createAutomationRuleV2(rule)).resolves.toEqual(rule);
    expect(fetchMock).toHaveBeenCalledWith("http://gateway.local:8082/iot.gateway.api.v2.DevicePlatformService/CreateAutomationRule", expect.objectContaining({ method: "POST", body: JSON.stringify({ rule }) }));
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).not.toContain("password");
  });
});
