import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearCredentials, setCredentials } from "@/api/auth";
import * as deviceApi from "@/api/device-v2";
import { getStatus } from "@/api/gateway";
import type { ActionNodeData } from "@/components/automation-flow/action-node";
import type { EventNodeData } from "@/components/automation-flow/event-node";
import { router } from "@/router";

vi.mock("@/api/gateway", () => ({ getStatus: vi.fn().mockResolvedValue({}), getQueueSummary: vi.fn().mockResolvedValue({}) }));
vi.mock("@/components/automation-flow/rule-canvas", () => ({
  RuleCanvas: ({ eventData, actionData }: { eventData: EventNodeData; actionData: ActionNodeData }) => <div>
    <button onClick={() => eventData.onDeviceChange?.("orangepi-monitor")}>Escolher origem</button>
    <button onClick={() => eventData.onOutputChannelChange?.("telemetry")}>Escolher canal</button>
    <button onClick={() => actionData.onDeviceChange?.("led-sala")}>Escolher destino</button>
    <button onClick={() => actionData.onCommandChange?.("set_led")}>Escolher comando</button>
  </div>,
}));

beforeEach(() => {
  setCredentials("operator", "test-password");
  vi.stubEnv("VITE_DEVICE_V2_MOCKS", "true");
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); clearCredentials(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function open(path: string) {
  const testRouter = createRouter({ routeTree: router.routeTree, history: createMemoryHistory({ initialEntries: [path] }) });
  render(<RouterProvider router={testRouter} />);
  await act(async () => { await testRouter.load(); });
  return testRouter;
}

it("shares automation queries across list/detail and invalidates the list after creation", async () => {
  const rules = await deviceApi.listAutomationRulesV2();
  const list = vi.spyOn(deviceApi, "listAutomationRulesV2").mockResolvedValue(rules);
  const devices = vi.spyOn(deviceApi, "listDevicesV2");
  const create = vi.spyOn(deviceApi, "createAutomationRuleV2").mockImplementation(async (rule) => {
    const created = { ...rule, updatedAt: new Date().toISOString() };
    list.mockResolvedValue([...rules, created]);
    return created;
  });
  const testRouter = await open("/automations");
  fireEvent.click(await screen.findByRole("link", { name: "orangepi-to-cyd" }));
  await screen.findByText("Detalhes da automação. Visualização somente leitura.");
  expect(list).toHaveBeenCalledTimes(1);
  await act(async () => { await testRouter.navigate({ to: "/automations/new" }); });
  fireEvent.click(await screen.findByRole("button", { name: "Escolher origem" }));
  fireEvent.click(screen.getByRole("button", { name: "Escolher canal" }));
  fireEvent.click(screen.getByRole("button", { name: "Escolher destino" }));
  fireEvent.click(screen.getByRole("button", { name: "Escolher comando" }));
  fireEvent.change(screen.getByLabelText("ID da regra"), { target: { value: "nova-regra" } });
  expect(screen.getByRole("button", { name: "Criar regra" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Criar regra" }));
  expect(await screen.findByRole("link", { name: "nova-regra" })).toBeInTheDocument();
  expect(create).toHaveBeenCalledTimes(1);
  expect(list).toHaveBeenCalledTimes(2);
  expect(devices).toHaveBeenCalledTimes(1);
});

it("refreshes registry, status and discovery after registration and caches the returned device", async () => {
  const devices = vi.spyOn(deviceApi, "listDevicesV2");
  const discovery = vi.spyOn(deviceApi, "listDiscoveryV2");
  const register = vi.spyOn(deviceApi, "registerDiscoveredDeviceV2");
  const detail = vi.spyOn(deviceApi, "getDeviceV2");
  vi.mocked(getStatus).mockClear();
  await open("/discovery/esp32c3-42a9");
  fireEvent.click(await screen.findByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Registrar device" }));
  await screen.findByText("Progresso do provisionamento");
  expect(register).toHaveBeenCalledOnce();
  await waitFor(() => expect(devices).toHaveBeenCalledTimes(2));
  expect(discovery).toHaveBeenCalledTimes(2);
  expect(getStatus).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Ver device" }));
  await screen.findByText("Binding ativo");
  expect(detail).not.toHaveBeenCalled();
});
