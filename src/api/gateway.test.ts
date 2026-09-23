import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getStatus,
  GatewayApiError,
  createRoute,
  listRoutes,
  listDeviceCommands,
  provisionDevice,
  provisionCYD,
	provisionDeviceByIP,
  provisionLED,
  registerExistingDevice,
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
      mqttUsername: "led-3", mqttPassword: "generated-secret", appliedAt: "2026-09-21T23:00:00Z",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(provisionDevice("led-3")).resolves.toMatchObject({ mqttUsername: "led-3" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://gateway.local:8082/iot.gateway.api.v1.DeviceAdminService/ProvisionDevice",
      expect.objectContaining({ body: JSON.stringify({ deviceId: "led-3", template: "esp32_led.v1" }) }),
    );
  });

  it("provisiona um CYD pelo IP sem receber senha MQTT no navegador", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      device: { id: "cyd-sala", type: "esp32-cyd", enabled: true },
      deviceIp: "192.168.15.42", appliedAt: "2026-09-23T14:00:00Z",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await provisionCYD("cyd-sala", "192.168.15.42");
    expect(response.deviceIp).toBe("192.168.15.42");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://gateway.local:8082/iot.gateway.api.v1.DeviceAdminService/ProvisionCYD",
      expect.objectContaining({ body: JSON.stringify({ deviceId: "cyd-sala", deviceIp: "192.168.15.42" }) }),
    );
  });

	it("provisiona um LED pelo IP sem receber senha MQTT no navegador", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      device: { id: "led-sala", type: "esp32", enabled: true, profile: "led.v1" },
      deviceIp: "192.168.15.43", appliedAt: "2026-09-23T16:00:00Z",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await provisionLED("led-sala", "192.168.15.43");
    expect(response).not.toHaveProperty("mqttPassword");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://gateway.local:8082/iot.gateway.api.v1.DeviceAdminService/ProvisionLED",
      expect.objectContaining({ body: JSON.stringify({ deviceId: "led-sala", deviceIp: "192.168.15.43" }) }),
    );
	});

	it("provisiona pelo manifest publicado sem receber senha MQTT no navegador", async () => {
		vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
			device: { id: "led-sala", type: "esp32c3-led", enabled: true },
			deviceIp: "192.168.15.43", manifestId: "esp32-c3-led", appliedAt: "2026-09-23T16:00:00Z",
		}), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		const response = await provisionDeviceByIP("led-sala", "esp32-c3-led", "192.168.15.43");
		expect(response).not.toHaveProperty("mqttPassword");
		expect(fetchMock).toHaveBeenCalledWith(
			"http://gateway.local:8082/iot.gateway.api.v1.DeviceAdminService/ProvisionDeviceByIP",
			expect.objectContaining({ body: JSON.stringify({ deviceId: "led-sala", manifestId: "esp32-c3-led", deviceIp: "192.168.15.43" }) }),
		);
	});

  it("adota o orangepi-monitor sem receber nem rotacionar senha MQTT", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      device: { id: "orangepi-monitor", type: "linux-system-monitor", enabled: true }, appliedAt: "2026-09-23T18:00:00Z",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(registerExistingDevice("orangepi-monitor")).resolves.toMatchObject({ device: { id: "orangepi-monitor" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://gateway.local:8082/iot.gateway.api.v1.DeviceAdminService/RegisterExistingDevice",
      expect.objectContaining({ body: JSON.stringify({ deviceId: "orangepi-monitor", template: "orangepi_monitor.v1" }) }),
    );
  });

  it("chama as operacoes de enabled e remocao", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ device: { id: "led-1", enabled: false } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ appliedAt: "2026-09-21T23:00:00Z" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await setDeviceEnabled("led-1", false);
    await removeDevice("led-1");
    expect(fetchMock.mock.calls[0][0]).toContain("DeviceAdminService/SetDeviceEnabled");
    expect(fetchMock.mock.calls[1][0]).toContain("DeviceAdminService/RemoveDevice");
  });

  it("lista e cria rotas persistidas", async () => {
    vi.stubEnv("VITE_GATEWAY_API_BASE_URL", "http://gateway.local:8082");
    const route = {
      id: "orangepi-to-monitor", sourceTopic: "devices/orangepi-monitor/telemetry",
      destinationTopic: "devices/monitor/command", commandType: "render_system_status", qos: 1, retain: false,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ routes: [route] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ route, appliedAt: "2026-09-23T18:00:00Z" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listRoutes()).resolves.toEqual([route]);
    await expect(createRoute(route)).resolves.toMatchObject({ route });
    expect(fetchMock.mock.calls[0][0]).toContain("DeviceAdminService/ListRoutes");
    expect(fetchMock.mock.calls[1][0]).toContain("DeviceAdminService/CreateRoute");
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
