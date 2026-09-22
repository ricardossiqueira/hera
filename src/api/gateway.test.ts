import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getStatus,
  GatewayApiError,
  listDeviceCommands,
  provisionDevice,
  removeDevice,
  setDeviceEnabled,
} from "./gateway";
import { clearCredentials, getCredentials, setCredentials } from "./auth";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  clearCredentials();
});

function stubStatusResponse(init: ResponseInit = { status: 200 }) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    started: true, mqttConnected: true, subscriptions: 1,
    acceptedMessages: "2", rejectedMessages: "0", localRoutesPublished: "0",
    localRoutesFailed: "0", outboxStored: "0", outboxDiscarded: "0", outboxFailed: "0",
  }), init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("getStatus", () => {
  it("chama o endpoint Connect com POST e JSON, sem Authorization quando não há credencial", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    const fetchMock = stubStatusResponse();

    await expect(getStatus()).resolves.toMatchObject({ mqttConnected: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://gateway.local:8082/iot.gateway.api.v1.GatewayService/GetStatus",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("envia Authorization: Basic quando há credencial em memória", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    setCredentials("admin", "admin");
    const fetchMock = stubStatusResponse();

    await getStatus();

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Basic " + btoa("admin:admin"));
  });

  it("em 401, limpa a credencial e lança um erro específico sem tentar reler o corpo", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    setCredentials("admin", "wrong");
    stubStatusResponse({ status: 401 });

    await expect(getStatus()).rejects.toMatchObject({ status: 401 } satisfies Partial<GatewayApiError>);
    expect(getCredentials()).toBeUndefined();
  });
});

describe("listDeviceCommands", () => {
  it("consulta o schema de comandos pelo ID do dispositivo", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      deviceId: "led-1", schemaValidated: true,
      commands: [{ type: "set_led", parametersMessage: "iot.device.led.v1.SetLed" }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listDeviceCommands("led-1")).resolves.toMatchObject({
      commands: [{ type: "set_led" }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://gateway.local:8082/iot.gateway.api.v1.DeviceService/ListDeviceCommands",
      expect.objectContaining({ body: JSON.stringify({ deviceId: "led-1" }) }),
    );
  });
});

describe("DeviceAdminService", () => {
  it("provisiona um LED e retorna a credencial de exibicao unica", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      device: { id: "led-3", type: "esp32", enabled: true, profile: "led.v1" },
      mqttUsername: "led-3", mqttPassword: "generated-secret", restartedAt: "2026-09-21T23:00:00Z",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(provisionDevice("led-3")).resolves.toMatchObject({ mqttUsername: "led-3" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://gateway.local:8082/iot.gateway.api.v1.DeviceAdminService/ProvisionDevice",
      expect.objectContaining({ body: JSON.stringify({ deviceId: "led-3", template: "esp32_led.v1" }) }),
    );
  });

  it("chama as operacoes de enabled e remocao", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ device: { id: "led-1", enabled: false } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ restartedAt: "2026-09-21T23:00:00Z" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await setDeviceEnabled("led-1", false);
    await removeDevice("led-1");
    expect(fetchMock.mock.calls[0][0]).toContain("DeviceAdminService/SetDeviceEnabled");
    expect(fetchMock.mock.calls[1][0]).toContain("DeviceAdminService/RemoveDevice");
  });

  it("traduz o codigo Connect already_exists para uma mensagem acionavel", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "already_exists", message: "raw server message",
    }), { status: 409 })));

    await expect(provisionDevice("led-1")).rejects.toMatchObject({
      code: "already_exists",
      message: expect.stringContaining("ID já em uso"),
    } satisfies Partial<GatewayApiError>);
  });
});
