import { authHeader, clearCredentials } from "./auth";
import { getGatewayApiBaseUrl } from "@/config";

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
  devices?: { total?: number; byActiveState?: Record<string, number> };
  discovery?: { total?: number; online?: number; offline?: number; byStatus?: Record<string, number> };
}

// GatewayEvent mirrors iot-gateway's ActivityEvent: the in-memory,
// payload-free activity log - not the outbox/fila above. kind is empty for
// a v2_rule_fired outcome (its own device/topic already identify it).
// "route_published"/"route_failed" existed only for V1's local routes,
// removed along with the rest of V1 (docs/decisions.md ADR-017).
export interface GatewayEvent {
  sequence: string;
  timestamp: string;
  deviceId: string;
  kind: string;
  topic: string;
  outcome: "accepted" | "rejected" | "v2_rule_fired";
  detail: string;
}

export interface RecentEventsFilter {
  deviceId?: string;
  since?: string;
  limit?: number;
  beforeSequence?: string;
}

export interface RecentEventsPage {
  events: GatewayEvent[];
  hasMore: boolean;
}

// QueueSummary mirrors internal/outbox.Snapshot: pending state right now,
// not GetStatus's lifetime outboxStored/Discarded/Failed counters.
// oldestEnqueuedAt is unset when pendingMessages is 0. There is currently no
// path that enqueues v2 device messages here - a known, documented gap
// (ADR-017), not a bug if this always reads empty.
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

const gatewayService = "/iot.gateway.api.v1.GatewayService";

async function request<T>(path: string, body: object): Promise<T> {
  const baseUrl = getGatewayApiBaseUrl()?.replace(/\/$/, "");
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

export async function getRecentEvents(filter: RecentEventsFilter = {}): Promise<RecentEventsPage> {
  const result = await request<{ events?: GatewayEvent[]; hasMore?: boolean }>(gatewayService + "/GetRecentEvents", {
    deviceId: filter.deviceId,
    since: filter.since,
    limit: filter.limit,
    beforeSequence: filter.beforeSequence,
  });
  return { events: result.events ?? [], hasMore: result.hasMore ?? false };
}
