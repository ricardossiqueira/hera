import { authHeader, clearCredentials } from "./auth";

export interface DeviceTopics {
  telemetry?: string;
  state?: string;
  event?: string;
  command?: string;
  commandResult?: string;
}

export interface Device {
  id: string;
  type: string;
  enabled: boolean;
  profile?: string;
  topics?: DeviceTopics;
}

export interface GatewayStatus {
  startedAt?: string;
  started: boolean;
  mqttConnected: boolean;
  subscriptions: number;
  acceptedMessages: string;
  rejectedMessages: string;
  localRoutesPublished: string;
  localRoutesFailed: string;
  outboxStored: string;
  outboxDiscarded: string;
  outboxFailed: string;
}

export interface CommandDescriptor {
  type: string;
  parametersMessage: string;
}

export interface ListDeviceCommandsResponse {
  deviceId: string;
  schemaValidated: boolean;
  commands: CommandDescriptor[];
}

export class GatewayApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "GatewayApiError";
  }
}

const deviceService = "/iot.gateway.api.v1.DeviceService";
const gatewayService = "/iot.gateway.api.v1.GatewayService";

export function getGatewayApiBaseUrl(): string | undefined {
  const value = import.meta.env.VITE_GATEWAY_API_BASE_URL?.trim();
  return value ? value.replace(/\/$/, "") : undefined;
}

async function request<T>(path: string, body: object): Promise<T> {
  const baseUrl = getGatewayApiBaseUrl();
  if (!baseUrl) {
    throw new GatewayApiError("Defina VITE_GATEWAY_API_BASE_URL para conectar ao gateway.");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = authHeader();
  if (auth) headers.Authorization = auth;

  let response: Response;
  try {
    response = await fetch(baseUrl + path, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {
    throw new GatewayApiError(
      "Não foi possível alcançar a API. Verifique a rede, a URL e a configuração de CORS.",
    );
  }

  if (response.status === 401) {
    // The browser never resends a stale/wrong credential on its own - drop
    // it so the UI falls back to the login screen and asks again, instead
    // of retrying every 10s with the same rejected credential.
    clearCredentials();
    throw new GatewayApiError("Usuário ou senha inválidos.", 401);
  }

  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) {
    throw new GatewayApiError(
      payload.message ?? "A API respondeu HTTP " + response.status + ".",
      response.status,
    );
  }
  return payload as T;
}

export function getStatus(): Promise<GatewayStatus> {
  return request(gatewayService + "/GetStatus", {});
}

export async function listDevices(): Promise<Device[]> {
  const result = await request<{ devices?: Device[] }>(deviceService + "/ListDevices", {});
  return result.devices ?? [];
}

export function listDeviceCommands(deviceId: string): Promise<ListDeviceCommandsResponse> {
  return request(deviceService + "/ListDeviceCommands", { deviceId });
}

export function publishSetLed(deviceId: string, on: boolean) {
  return request<{ commandId: string; publishedAt: string }>(
    deviceService + "/PublishCommand",
    { deviceId, type: "set_led", parameters: { on } },
  );
}
