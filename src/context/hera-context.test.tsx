import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { deviceV2Fixtures, getDeviceTelemetryV2, listDevicesV2, type RegisteredDeviceV2 } from "@/api/device-v2";
import { HeraProvider, useHera } from "./hera-context";

vi.mock("@/api/gateway", () => ({ getStatus: vi.fn().mockResolvedValue({}), getQueueSummary: vi.fn().mockResolvedValue({}) }));
vi.mock("@/api/device-v2", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/api/device-v2")>(),
  listDevicesV2: vi.fn(), getDeviceTelemetryV2: vi.fn(),
}));

const device = (deviceId: string, telemetry = true) => ({ deviceId, manifest: telemetry ? deviceV2Fixtures.orangePiManifest : deviceV2Fixtures.ledManifest }) as RegisteredDeviceV2;

beforeEach(() => { vi.mocked(listDevicesV2).mockResolvedValue([device("sensor"), device("led", false)]); });
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.useRealTimers(); });

it("loads only manifest-declared telemetry and isolates device errors", async () => {
  vi.mocked(listDevicesV2).mockResolvedValue([device("sensor"), device("broken"), device("empty"), device("led", false)]);
  vi.mocked(getDeviceTelemetryV2).mockImplementation(async (id) => {
    if (id === "broken") throw new Error("sensor unavailable");
    return id === "empty" ? { available: false } : { available: true, fields: { cpu_pct: 12.5 } };
  });
  const { result } = renderHook(useHera, { wrapper: HeraProvider });
  await waitFor(() => expect(result.current.telemetry.loading).toBe(false));
  expect(getDeviceTelemetryV2).toHaveBeenCalledTimes(3);
  expect(getDeviceTelemetryV2).not.toHaveBeenCalledWith("led");
  expect(listDevicesV2).toHaveBeenCalledTimes(1);
  expect(result.current.devices.data).toHaveLength(4);
  expect(result.current.devices.data?.[3].deviceId).toBe("led");
  expect(result.current.telemetry.data).toEqual([
    { device: device("sensor"), snapshot: { available: true, fields: { cpu_pct: 12.5 } } },
    { device: device("broken"), error: "sensor unavailable" },
    { device: device("empty"), snapshot: { available: false } },
  ]);
});

it("polls every ten seconds, skips overlapping refreshes and stops on unmount", async () => {
  vi.useFakeTimers();
  let resolveSnapshot!: (snapshot: { available: boolean }) => void;
  vi.mocked(getDeviceTelemetryV2).mockImplementation(() => new Promise((resolve) => { resolveSnapshot = resolve; }));
  const { result, unmount } = renderHook(useHera, { wrapper: HeraProvider });
  await act(async () => {});
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); await result.current.refreshTelemetry(); });
  expect(getDeviceTelemetryV2).toHaveBeenCalledTimes(1);
  await act(async () => { resolveSnapshot({ available: false }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
  expect(getDeviceTelemetryV2).toHaveBeenCalledTimes(2);
  await act(async () => { resolveSnapshot({ available: false }); });
  unmount();
  await vi.advanceTimersByTimeAsync(20_000);
  expect(getDeviceTelemetryV2).toHaveBeenCalledTimes(2);
});

it("keeps the last data with an explicit error when refreshing the registry fails", async () => {
  vi.mocked(getDeviceTelemetryV2).mockResolvedValue({ available: true, fields: { value: 0 } });
  const { result } = renderHook(useHera, { wrapper: HeraProvider });
  await waitFor(() => expect(result.current.telemetry.loading).toBe(false));
  vi.mocked(listDevicesV2).mockRejectedValueOnce(new Error("registry unavailable"));
  await act(async () => { await result.current.refreshTelemetry(); });
  expect(result.current.telemetry.error).toBe("registry unavailable");
  expect(result.current.devices.error).toBe("registry unavailable");
  expect(result.current.devices.data).toHaveLength(2);
  expect(result.current.telemetry.data?.[0].snapshot?.fields).toEqual({ value: 0 });
});
