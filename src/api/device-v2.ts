import { authHeader, clearCredentials } from "./auth";

/**
 * Browser contract for DEVICE_PLATFORM_V2_IMPLEMENTATION.md.  It deliberately
 * has no model-specific fields: the API returns the manifest observed from a
 * device and the UI derives every available output/input from it.
 *
 * Requests target the Gateway whenever VITE_GATEWAY_URL is configured.
 * Deterministic fixtures are deliberately available only through the explicit
 * development opt-in VITE_DEVICE_V2_MOCKS=true.
 */
export type OutputChannel = "telemetry" | "state" | "event" | "command-result";
export type FieldType = "boolean" | "string" | "number" | "integer";
export type FieldSchema = Record<string, { type: FieldType; required?: boolean }>;

export interface EventDefinitionV2 { type: string; payload: FieldSchema }
export interface CommandDefinitionV2 { type: string; parameters: FieldSchema }
export interface PublishDefinitionV2 {
  channel: OutputChannel;
  retained?: boolean;
  schema?: FieldSchema;
  events?: EventDefinitionV2[];
}
export interface SubscribeDefinitionV2 {
  channel: "command";
  commands: CommandDefinitionV2[];
}
export interface DeviceManifestV2 {
  schema_version: 2;
  manifest_id: string;
  display_name: string;
  model: string;
  protocol_version: 1;
  mqtt: { publish: PublishDefinitionV2[]; subscribe: SubscribeDefinitionV2[] };
}

export type DiscoveryStatus = "seen" | "inspected" | "pairing_required" | "ready_to_register" | "registered" | "rejected" | "offline";
export type TrustStatus = "trusted" | "unknown" | "invalid";
export interface DiscoveredDeviceV2 {
  deviceUid: string;
  address: string;
  port: number;
  model: string;
  firmwareVersion: string;
  manifest: DeviceManifestV2;
  manifestSha256: string;
  identityFingerprint: string;
  trust: TrustStatus;
  status: DiscoveryStatus;
  pairingRequired: boolean;
  lastSeenAt: string;
  diagnostic?: string;
}

export type DeviceStateV2 = "pending" | "active" | "disabled" | "recovery";
export interface RegisteredDeviceV2 {
  deviceId: string;
  deviceUid: string;
  firmwareVersion: string;
  manifest: DeviceManifestV2;
  manifestHash: string;
  manifestRevision: string;
  desiredState: DeviceStateV2;
  activeState: "active" | "offline" | "pending" | "failed";
  identityFingerprint: string;
  updatedAt: string;
  recoveryReason?: string;
}

export interface RegistrationStepV2 {
  id: "pairing" | "manifest" | "binding" | "provisioning" | "activation";
  label: string;
  status: "complete" | "pending" | "failed";
  detail?: string;
}
export interface RegisterDiscoveredDeviceResponseV2 {
  device: RegisteredDeviceV2;
  steps: RegistrationStepV2[];
}

export interface AutomationRuleV2 {
  id: string;
  enabled: boolean;
  trigger: {
    sourceDeviceId: string;
    outputChannel: OutputChannel;
    eventType?: string;
    ignoreRetained?: boolean;
    conditionJson?: string;
  };
  action: { targetDeviceId: string; commandType: string; parameters: Record<string, unknown> };
  updatedAt: string;
}

const ledManifest: DeviceManifestV2 = {
  schema_version: 2, manifest_id: "esp32-c3-led", display_name: "ESP32-C3 LED", model: "esp32c3-led", protocol_version: 1,
  mqtt: {
    publish: [
      { channel: "state", retained: true, schema: { on: { type: "boolean", required: true }, online: { type: "boolean", required: true } } },
      { channel: "event", events: [{ type: "led.state_changed", payload: { on: { type: "boolean", required: true } } }] },
    ],
    subscribe: [{ channel: "command", commands: [{ type: "set_led", parameters: { on: { type: "boolean", required: true } } }] }],
  },
};
const cydManifest: DeviceManifestV2 = {
  schema_version: 2, manifest_id: "cyd-monitor", display_name: "CYD Monitor", model: "cyd-monitor", protocol_version: 1,
  mqtt: { publish: [], subscribe: [{ channel: "command", commands: [{ type: "render_system_status", parameters: { timestamp: { type: "string", required: true }, cpu_pct: { type: "number" } } }] }] },
};
const orangePiManifest: DeviceManifestV2 = {
  schema_version: 2, manifest_id: "orangepi-monitor", display_name: "Orange Pi Monitor", model: "orangepi-monitor", protocol_version: 1,
  mqtt: { publish: [{ channel: "telemetry", schema: { cpu_pct: { type: "number" }, memory_used_mb: { type: "number" }, timestamp: { type: "string" } } }], subscribe: [] },
};

export const deviceV2Fixtures = { ledManifest, cydManifest, orangePiManifest };

const fixtureDiscovery: DiscoveredDeviceV2[] = [
  { deviceUid: "esp32c3-42a9", address: "192.168.15.43", port: 8080, model: "esp32c3-led", firmwareVersion: "2.0.0", manifest: ledManifest, manifestSha256: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6", identityFingerprint: "ED25519:4a9c…8b12", trust: "trusted", status: "ready_to_register", pairingRequired: true, lastSeenAt: "2026-10-01T12:00:00Z" },
  { deviceUid: "cyd-7781", address: "192.168.15.57", port: 8080, model: "cyd-monitor", firmwareVersion: "2.0.0", manifest: cydManifest, manifestSha256: "cyd7cyd7cyd7cyd7cyd7cyd7cyd7cyd7", identityFingerprint: "ED25519:1d72…74f0", trust: "unknown", status: "pairing_required", pairingRequired: true, lastSeenAt: "2026-10-01T11:59:51Z" },
  { deviceUid: "orangepi-1138", address: "192.168.15.22", port: 8080, model: "orangepi-monitor", firmwareVersion: "2.0.0", manifest: orangePiManifest, manifestSha256: "0a0b0c0d0e0f10111213141516171819", identityFingerprint: "ED25519:lab…1138", trust: "trusted", status: "offline", pairingRequired: false, lastSeenAt: "2026-10-01T11:57:30Z", diagnostic: "Sem anúncio mDNS há 150 segundos." },
];
const fixtureDevices: RegisteredDeviceV2[] = [
  { deviceId: "led-sala", deviceUid: "esp32c3-001", firmwareVersion: "2.0.0", manifest: ledManifest, manifestHash: "f0e1d2c3b4a5968778695a4b3c2d1e0f", manifestRevision: "f0e1d2c3", desiredState: "active", activeState: "active", identityFingerprint: "ED25519:trusted…001", updatedAt: "2026-10-01T11:51:00Z" },
  { deviceId: "cyd-painel", deviceUid: "cyd-004", firmwareVersion: "2.0.0", manifest: cydManifest, manifestHash: "c0d0c0d0c0d0c0d0c0d0c0d0c0d0c0d0", manifestRevision: "c0d0c0d0", desiredState: "active", activeState: "active", identityFingerprint: "ED25519:trusted…004", updatedAt: "2026-10-01T11:49:00Z" },
  { deviceId: "orangepi-monitor", deviceUid: "orangepi-001", firmwareVersion: "2.0.0", manifest: orangePiManifest, manifestHash: "aabbccddeeff00112233445566778899", manifestRevision: "aabbccdd", desiredState: "active", activeState: "active", identityFingerprint: "ED25519:trusted…opi", updatedAt: "2026-10-01T11:48:00Z" },
];
const fixtureRules: AutomationRuleV2[] = [{
  id: "orangepi-to-cyd", enabled: true,
  trigger: { sourceDeviceId: "orangepi-monitor", outputChannel: "telemetry", conditionJson: "" },
  action: { targetDeviceId: "cyd-painel", commandType: "render_system_status", parameters: { timestamp: "2026-10-01T12:00:00Z" } }, updatedAt: "2026-10-01T11:52:00Z",
}];

export class DevicePlatformApiError extends Error {
  constructor(message: string, public readonly status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "DevicePlatformApiError";
  }
}

function useMocks() {
  return import.meta.env.VITE_DEVICE_V2_MOCKS === "true";
}

function gatewayURL(): string {
  const value = import.meta.env.VITE_GATEWAY_URL?.trim();
  if (!value) {
    throw new DevicePlatformApiError("Defina VITE_GATEWAY_URL ou habilite VITE_DEVICE_V2_MOCKS=true para usar fixtures de desenvolvimento.");
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new DevicePlatformApiError("VITE_GATEWAY_URL deve ser uma URL HTTP(S) válida.");
  }
}

async function responsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new DevicePlatformApiError("O Gateway retornou uma resposta JSON inválida.", response.status);
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  return `API Device Platform respondeu HTTP ${status}.`;
}

async function requestV2<T>(method: string, body: object): Promise<T> {
  const baseUrl = gatewayURL();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = authHeader();
  if (auth) headers.Authorization = auth;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/iot.gateway.api.v2.DevicePlatformService/${method}`, { method: "POST", headers, credentials: "include", body: JSON.stringify(body) });
  } catch (cause) {
    throw new DevicePlatformApiError("Não foi possível conectar ao Gateway configurado.", undefined, { cause });
  }
  if (response.status === 401) {
    clearCredentials();
    throw new DevicePlatformApiError("Autenticação com o Gateway falhou. Faça login novamente.", response.status);
  }
  const payload = await responsePayload(response);
  if (!response.ok) throw new DevicePlatformApiError(errorMessage(payload, response.status), response.status);
  return payload as T;
}

export async function listDiscoveryV2(): Promise<DiscoveredDeviceV2[]> {
  if (useMocks()) return fixtureDiscovery;
  const result = await requestV2<{ entries?: DiscoveredDeviceV2[] }>("ListDiscovery", {});
  return result.entries ?? [];
}
export async function registerDiscoveredDeviceV2(deviceUid: string, deviceId: string): Promise<RegisterDiscoveredDeviceResponseV2> {
  if (useMocks()) {
    const entry = fixtureDiscovery.find((item) => item.deviceUid === deviceUid);
    if (!entry) throw new Error("Device descoberto não encontrado.");
    const device: RegisteredDeviceV2 = { deviceId, deviceUid, firmwareVersion: entry.firmwareVersion, manifest: entry.manifest, manifestHash: entry.manifestSha256, manifestRevision: entry.manifestSha256.slice(0, 8), desiredState: "active", activeState: "active", identityFingerprint: entry.identityFingerprint, updatedAt: new Date().toISOString() };
    return { device, steps: [
      { id: "pairing", label: "Pairing e prova de identidade", status: "complete" },
      { id: "manifest", label: "Manifest validado", status: "complete" },
      { id: "binding", label: "Binding e ACL derivada", status: "complete" },
      { id: "provisioning", label: "Configuração entregue ao device", status: "complete" },
      { id: "activation", label: "Device ativado", status: "complete" },
    ] };
  }
  return requestV2("RegisterDiscoveredDevice", { deviceUid, deviceId });
}
export async function listDevicesV2(): Promise<RegisteredDeviceV2[]> {
  if (useMocks()) return fixtureDevices;
  const result = await requestV2<{ devices?: RegisteredDeviceV2[] }>("ListDevices", {});
  return result.devices ?? [];
}
export async function getDeviceV2(deviceId: string): Promise<RegisteredDeviceV2> {
  if (useMocks()) {
    const device = fixtureDevices.find((item) => item.deviceId === deviceId);
    if (!device) throw new Error("Device não encontrado.");
    return device;
  }
  return requestV2("GetDevice", { deviceId });
}
export async function listAutomationRulesV2(): Promise<AutomationRuleV2[]> {
  if (useMocks()) return fixtureRules;
  const result = await requestV2<{ rules?: AutomationRuleV2[] }>("ListAutomationRules", {});
  return result.rules ?? [];
}
export async function createAutomationRuleV2(rule: AutomationRuleV2): Promise<AutomationRuleV2> {
  if (useMocks()) return { ...rule, updatedAt: new Date().toISOString() };
  const result = await requestV2<{ rule: AutomationRuleV2 }>("CreateAutomationRule", { rule });
  return result.rule;
}

export interface PublishCommandResponseV2 {
  commandId: string;
  publishedAt: string;
}
export async function publishCommandV2(deviceId: string, type: string, parameters: Record<string, unknown>): Promise<PublishCommandResponseV2> {
  if (useMocks()) return { commandId: "mock-command", publishedAt: new Date().toISOString() };
  return requestV2("PublishCommand", { deviceId, type, parameters });
}

export function outputLabel(channel: OutputChannel) {
  return { telemetry: "Telemetria", state: "Estado", event: "Evento", "command-result": "Resultado de comando" }[channel];
}
