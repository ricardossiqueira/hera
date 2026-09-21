// In-memory-only HTTP Basic Auth credential store - see docs/spec.md's
// "Spike obrigatório de autenticação": a cross-origin `fetch()` never
// attaches a browser's cached Basic Auth automatically (that only happens
// for a same-origin request after a native credential prompt, which
// `fetch()` never triggers), so this app must build and send the
// `Authorization` header itself. Deliberately not persisted anywhere
// (no localStorage/sessionStorage/cookie): reloading the page always asks
// again, matching the spec's "sem contas, sessões nem RBAC" decision.

export interface Credentials {
  username: string;
  password: string;
}

let credentials: Credentials | undefined;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function getCredentials(): Credentials | undefined {
  return credentials;
}

export function setCredentials(username: string, password: string): void {
  credentials = { username, password };
  notify();
}

export function clearCredentials(): void {
  if (!credentials) return;
  credentials = undefined;
  notify();
}

/** React-friendly subscription: call again on every change, unsubscribe via the returned function. */
export function subscribeCredentials(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function authHeader(): string | undefined {
  if (!credentials) return undefined;
  return "Basic " + btoa(`${credentials.username}:${credentials.password}`);
}
