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

export interface ProvisionDeviceResponse {
  device: Device;
  mqttUsername: string;
  mqttPassword: string;
  restartedAt: string;
}

export interface SetDeviceEnabledResponse {
  device: Device;
  restartedAt: string;
}

export interface RemoveDeviceResponse {
  restartedAt: string;
}

export class GatewayApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "GatewayApiError";
  }
}

const deviceService = "/iot.gateway.api.v1.DeviceService";
const gatewayService = "/iot.gateway.api.v1.GatewayService";
const deviceAdminService = "/iot.gateway.api.v1.DeviceAdminService";

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

  const payload = await response.json().catch(() => ({})) as { message?: string; code?: string };
  if (!response.ok) {
    const message = errorMessage(payload.code, payload.message, response.status);
    throw new GatewayApiError(
      message,
      response.status,
      payload.code,
    );
  }
  return payload as T;
}

function errorMessage(code: string | undefined, fallback: string | undefined, status: number): string {
  switch (code) {
    case "already_exists":
      return "ID já em uso. Escolha outro identificador para o dispositivo.";
    case "not_found":
      return "Dispositivo não encontrado. Atualize a lista e tente novamente.";
    case "invalid_argument":
      return "Os dados informados são inválidos. Revise os campos e tente novamente.";
    case "internal":
      return "O gateway não conseguiu concluir a operação. Nenhuma ação adicional deve ser tentada antes de verificar o diagnóstico.";
    default:
      return fallback ?? "A API respondeu HTTP " + status + ".";
  }
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

export function provisionDevice(
  deviceId: string,
  template = "esp32_led.v1",
): Promise<ProvisionDeviceResponse> {
  return request(deviceAdminService + "/ProvisionDevice", { deviceId, template });
}

export function setDeviceEnabled(
  deviceId: string,
  enabled: boolean,
): Promise<SetDeviceEnabledResponse> {
  return request(deviceAdminService + "/SetDeviceEnabled", { deviceId, enabled });
}

export function removeDevice(deviceId: string): Promise<RemoveDeviceResponse> {
  return request(deviceAdminService + "/RemoveDevice", { deviceId });
}
