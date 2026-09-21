import { afterEach, describe, expect, it, vi } from "vitest";
import { authHeader, clearCredentials, getCredentials, setCredentials, subscribeCredentials } from "./auth";

afterEach(() => clearCredentials());

describe("auth", () => {
  it("has no credential and no header by default", () => {
    expect(getCredentials()).toBeUndefined();
    expect(authHeader()).toBeUndefined();
  });

  it("stores a credential and builds a Basic Auth header from it", () => {
    setCredentials("admin", "admin");
    expect(getCredentials()).toEqual({ username: "admin", password: "admin" });
    expect(authHeader()).toBe("Basic " + btoa("admin:admin"));
  });

  it("clears the credential", () => {
    setCredentials("admin", "admin");
    clearCredentials();
    expect(getCredentials()).toBeUndefined();
    expect(authHeader()).toBeUndefined();
  });

  it("notifies subscribers on set and on clear, not on a redundant clear", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCredentials(listener);

    setCredentials("admin", "admin");
    expect(listener).toHaveBeenCalledTimes(1);

    clearCredentials();
    expect(listener).toHaveBeenCalledTimes(2);

    clearCredentials(); // already cleared - must not notify again
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setCredentials("admin", "admin");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
