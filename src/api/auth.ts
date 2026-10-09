import { getGatewayApiBaseUrl, getGatewayUrl } from "@/config";

// The browser persists only Hestia's HttpOnly cookie. This module keeps the
// current operator and CSRF token in memory and restores both after reload.
export type AuthState =
  | { status: "checking" }
  | { status: "anonymous"; needsRegistration: boolean; error?: string }
  | { status: "authenticated"; username: string; csrfToken: string };

type SessionResponse =
  | { authenticated: false; needsRegistration: boolean }
  | { authenticated: true; username: string; csrfToken: string };

let state: AuthState = { status: "checking" };
let generation = 0;
const listeners = new Set<() => void>();

function publish(next: AuthState) {
  state = next;
  for (const listener of listeners) listener();
}

export function getAuthState(): AuthState { return state; }
export function subscribeAuth(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function csrfToken(): string | undefined { return state.status === "authenticated" ? state.csrfToken : undefined; }

export function setSession(session: { username: string; csrfToken: string }) {
  generation++;
  publish({ status: "authenticated", username: session.username, csrfToken: session.csrfToken });
}

export function clearSession() {
  generation++;
  publish({ status: "anonymous", needsRegistration: false });
}

function baseUrl() {
  const url = getGatewayUrl() ?? getGatewayApiBaseUrl();
  if (!url) throw new Error("Defina VITE_GATEWAY_URL para conectar ao Hestia.");
  return url.replace(/\/$/, "");
}

async function authRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl()}/auth/${path}`, { credentials: "include", cache: "no-store", ...init });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    if (path === "login" && response.status === 401) throw new Error("Usuário ou senha inválidos.");
    if (path === "login" && response.status === 429) throw new Error("Muitas tentativas de login. Aguarde alguns minutos.");
    if (path === "register" && response.status === 401) throw new Error("A credencial admin do Hestia está incorreta.");
    if (path === "register" && response.status === 409) throw new Error("A primeira conta já foi cadastrada. Entre com ela.");
    throw new Error(payload.message || `Autenticação respondeu HTTP ${response.status}.`);
  }
  return response;
}

export async function restoreSession() {
  const currentGeneration = generation;
  try {
    if (import.meta.env.VITE_DEVICE_V2_MOCKS === "true") {
      if (state.status !== "authenticated") publish({ status: "anonymous", needsRegistration: !mockAccount });
      return;
    }
    const response = await authRequest("session", { method: "GET" });
    const session = await response.json() as SessionResponse;
    if (generation !== currentGeneration) return;
    if (session.authenticated) setSession(session);
    else publish({ status: "anonymous", needsRegistration: session.needsRegistration });
  } catch (error) {
    if (generation === currentGeneration) publish({ status: "anonymous", needsRegistration: false, error: error instanceof Error ? error.message : "Não foi possível consultar a sessão." });
  }
}

let mockAccount: { username: string; password: string } | undefined;

export async function registerOperator(username: string, password: string, adminUsername: string, adminPassword: string) {
  if (import.meta.env.VITE_DEVICE_V2_MOCKS === "true") {
    if (mockAccount) throw new Error("Operador já cadastrado.");
    mockAccount = { username, password };
    return;
  }
  await authRequest("register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${adminUsername}:${adminPassword}`)}` },
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username: string, password: string) {
  if (import.meta.env.VITE_DEVICE_V2_MOCKS === "true") {
    if (mockAccount && (mockAccount.username !== username || mockAccount.password !== password)) throw new Error("Usuário ou senha inválidos.");
    setSession({ username, csrfToken: "mock-csrf" });
    return;
  }
  const response = await authRequest("login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  const session = await response.json() as SessionResponse;
  if (!session.authenticated) throw new Error("O Hestia não iniciou a sessão.");
  setSession(session);
}

export async function logout() {
  if (import.meta.env.VITE_DEVICE_V2_MOCKS !== "true") {
    await authRequest("logout", { method: "POST", headers: { "X-CSRF-Token": csrfToken() ?? "" } });
  }
  clearSession();
}
