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
  appliedAt: string;
}

export interface SetDeviceEnabledResponse {
  device: Device;
  appliedAt: string;
}

export interface ProvisionCYDResponse {
  device: Device;
  deviceIp: string;
  appliedAt: string;
}

export interface ProvisionLEDResponse {
  device: Device;
  deviceIp: string;
  appliedAt: string;
}

export interface RegisterExistingDeviceResponse {
  device: Device;
  appliedAt: string;
}

export interface RemoveDeviceResponse {
  appliedAt: string;
}

export interface Route {
  id: string;
  sourceTopic: string;
  destinationTopic: string;
  commandType: string;
  qos: number;
  retain: boolean;
}

export interface CreateRouteResponse {
  route: Route;
  appliedAt: string;
}

// Inconsistency mirrors iot-gateway's registry.Inconsistency (see
// docs/api-v1.md's "Inconsistências de provisionamento"): a provisioning
// operation whose best-effort compensation (rollback) itself failed, left
// durably recorded. Not a reconciler/retry queue - iot-gateway doesn't have
// one - just a record for an operator to act on and then resolve.
export interface Inconsistency {
  id: string;
  kind: string;
  deviceId: string;
  cause: string;
  compensationError: string;
  createdAt: string;
}

// OrangePiTelemetry mirrors orangepi-monitor's payload
// (internal/metrics/payload.go): cpu_pct, memory_used_mb, memory_total_mb,
// disk_used_pct, load_1, temperature_c?, uptime_s, plus message_id/timestamp
// that GetDeviceTelemetryResponse already surfaces separately as observedAt.
export interface OrangePiTelemetry {
  cpu_pct?: number;
  memory_used_mb?: number;
  memory_total_mb?: number;
  disk_used_pct?: number;
  load_1?: number;
  temperature_c?: number;
  uptime_s?: number;
}

export interface DeviceTelemetry {
  deviceId: string;
  available: boolean;
  payload?: OrangePiTelemetry;
  observedAt?: string;
}

// GatewayEvent mirrors iot-gateway's ActivityEvent (docs/api-v1.md's
// "Atividade recente"): the in-memory, payload-free activity log - not the
// outbox/fila above. kind is empty for a route_published/route_failed
// outcome (a route spans two devices, not one).
export interface GatewayEvent {
  timestamp: string;
  deviceId: string;
  kind: string;
  topic: string;
  outcome: "accepted" | "rejected" | "route_published" | "route_failed";
  detail: string;
}

// QueueSummary mirrors internal/outbox.Snapshot (see docs/api-v1.md's
// "Resumo da fila"): pending state right now, not GetStatus's lifetime
// outboxStored/Discarded/Failed counters. oldestEnqueuedAt is unset when
// pendingMessages is 0.
export interface QueueSummary {
  pendingMessages: string;
  pendingBytes: string;
  oldestEnqueuedAt?: string;
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

export function getQueueSummary(): Promise<QueueSummary> {
  return request(gatewayService + "/GetQueueSummary", {});
}

export async function getRecentEvents(): Promise<GatewayEvent[]> {
  const result = await request<{ events?: GatewayEvent[] }>(gatewayService + "/GetRecentEvents", {});
  return result.events ?? [];
}

export async function listDevices(): Promise<Device[]> {
  const result = await request<{ devices?: Device[] }>(deviceService + "/ListDevices", {});
  return result.devices ?? [];
}

export function listDeviceCommands(deviceId: string): Promise<ListDeviceCommandsResponse> {
  return request(deviceService + "/ListDeviceCommands", { deviceId });
}

// getDeviceTelemetry never throws for "nothing received yet" - the gateway
// answers available:false, not an error (see docs/api-v1.md's "Telemetria
// em cache"). It still throws GatewayApiError for an unknown device_id or a
// transport/auth failure, same as every other call here.
export function getDeviceTelemetry(deviceId: string): Promise<DeviceTelemetry> {
  return request(deviceService + "/GetDeviceTelemetry", { deviceId });
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

// ProvisionCYD never receives MQTT credentials in the browser. The gateway
// delivers them directly to the CYD's temporary first-boot endpoint.
export function provisionCYD(deviceId: string, deviceIp: string): Promise<ProvisionCYDResponse> {
  return request(deviceAdminService + "/ProvisionCYD", { deviceId, deviceIp });
}

// ProvisionLED delivers the generated MQTT identity directly to the LED NVS.
// The browser receives only the durable device record and the selected IP.
export function provisionLED(deviceId: string, deviceIp: string): Promise<ProvisionLEDResponse> {
  return request(deviceAdminService + "/ProvisionLED", { deviceId, deviceIp });
}

// RegisterExistingDevice adopts a known local broker identity. Unlike device
// provisioning, it neither receives nor rotates an MQTT password.
export function registerExistingDevice(
  deviceId: string,
  template = "orangepi_monitor.v1",
): Promise<RegisterExistingDeviceResponse> {
  return request(deviceAdminService + "/RegisterExistingDevice", { deviceId, template });
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

export async function listRoutes(): Promise<Route[]> {
  const result = await request<{ routes?: Route[] }>(deviceAdminService + "/ListRoutes", {});
  return result.routes ?? [];
}

export function createRoute(route: Route): Promise<CreateRouteResponse> {
  return request(deviceAdminService + "/CreateRoute", { route });
}

export function removeRoute(routeId: string): Promise<{ appliedAt: string }> {
  return request(deviceAdminService + "/RemoveRoute", { routeId });
}

export async function listInconsistencies(): Promise<Inconsistency[]> {
  const result = await request<{ inconsistencies?: Inconsistency[] }>(deviceAdminService + "/ListInconsistencies", {});
  return result.inconsistencies ?? [];
}

export function resolveInconsistency(id: string): Promise<Record<string, never>> {
  return request(deviceAdminService + "/ResolveInconsistency", { id });
}
