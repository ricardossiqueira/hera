import { afterEach, expect, it, vi } from "vitest";
import { clearSession, csrfToken, getAuthState, login, logout, registerOperator, restoreSession, setSession, subscribeAuth } from "./auth";

afterEach(() => { clearSession(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("keeps only the current operator and CSRF token in memory", () => {
  const listener = vi.fn();
  const unsubscribe = subscribeAuth(listener);
  setSession({ username: "operator", csrfToken: "csrf" });
  expect(getAuthState()).toEqual({ status: "authenticated", username: "operator", csrfToken: "csrf" });
  expect(csrfToken()).toBe("csrf");
  clearSession();
  expect(getAuthState().status).toBe("anonymous");
  expect(csrfToken()).toBeUndefined();
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
});

it("registers once with admin Basic, then logs in with an HttpOnly cookie supplied by Hestia", async () => {
  vi.stubEnv("VITE_DEVICE_V2_MOCKS", "false");
  vi.stubEnv("VITE_GATEWAY_URL", "https://hera.example/api");
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ username: "operator" }), { status: 201 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: true, username: "operator", csrfToken: "csrf" }), { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  await registerOperator("operator", "long-operator-password", "gateway-admin", "secret");
  expect(fetchMock).toHaveBeenNthCalledWith(1, "https://hera.example/api/auth/register", expect.objectContaining({
    credentials: "include", headers: expect.objectContaining({ Authorization: `Basic ${btoa("gateway-admin:secret")}` }),
  }));
  await login("operator", "long-operator-password");
  expect(getAuthState()).toEqual({ status: "authenticated", username: "operator", csrfToken: "csrf" });
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  await logout();
  expect(fetchMock).toHaveBeenNthCalledWith(3, "https://hera.example/api/auth/logout", expect.objectContaining({ headers: { "X-CSRF-Token": "csrf" } }));
  expect(getAuthState().status).toBe("anonymous");
});

it("restores a session after reload without a stored password", async () => {
  vi.stubEnv("VITE_DEVICE_V2_MOCKS", "false");
  vi.stubEnv("VITE_GATEWAY_URL", "https://hera.example/api");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: true, username: "operator", csrfToken: "restored" }))));
  clearSession();
  await restoreSession();
  expect(getAuthState()).toEqual({ status: "authenticated", username: "operator", csrfToken: "restored" });
});
