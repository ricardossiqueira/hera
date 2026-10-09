import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  RuleCanvas: ({ eventData, actionData, conditionData }: { eventData: EventNodeData; actionData: ActionNodeData; conditionData: { mode: string; conditionJson: string } }) => <div>
    <output aria-label="automation-canvas-values">{[conditionData.mode, eventData.deviceId, eventData.outputChannel, eventData.eventType, conditionData.conditionJson, actionData.deviceId, actionData.commandType, JSON.stringify(actionData.parametersValues)].join("|")}</output>
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

it("edits an existing automation with its saved trigger, condition, command parameters and enabled state", async () => {
  const original = {
    id: "edit-test", enabled: false,
    trigger: { sourceDeviceId: "orangepi-monitor", outputChannel: "telemetry" as const, conditionJson: '{"==":[{"var":"cpu_pct"},12]}' },
    action: { targetDeviceId: "cyd-painel", commandType: "render_system_status", parameters: { timestamp: "saved-time", legacy_value: 17 } },
    updatedAt: "2026-10-01T00:00:00Z",
  };
  let rules: deviceApi.AutomationRuleV2[] = [original];
  const list = vi.spyOn(deviceApi, "listAutomationRulesV2").mockImplementation(async () => rules);
  const update = vi.spyOn(deviceApi, "updateAutomationRuleV2").mockImplementation(async (rule) => {
    const saved = { ...rule, updatedAt: "2026-10-08T00:00:00Z" };
    rules = [saved];
    return saved;
  });
  const testRouter = await open("/automations/edit-test/edit");
  expect(await screen.findByLabelText("automation-canvas-values")).toHaveTextContent("edit|orangepi-monitor|telemetry||{\"==\":[{\"var\":\"cpu_pct\"},12]}|cyd-painel|render_system_status|{\"timestamp\":\"saved-time\",\"legacy_value\":\"17\"}");
  expect(screen.getByLabelText("ID da regra")).toHaveValue("edit-test");
  expect(screen.getByRole("switch", { name: "Habilitada" })).toHaveAttribute("data-state", "unchecked");
  fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
  await waitFor(() => expect(update).toHaveBeenCalledOnce());
  await waitFor(() => expect(testRouter.state.location.pathname).toBe("/automations/edit-test"));
  expect(update).toHaveBeenCalledWith({
    id: "edit-test", enabled: false,
    trigger: { sourceDeviceId: "orangepi-monitor", outputChannel: "telemetry", eventType: undefined, ignoreRetained: undefined, conditionJson: '{"==":[{"var":"cpu_pct"},12]}' },
    action: { targetDeviceId: "cyd-painel", commandType: "render_system_status", parameters: { timestamp: "saved-time", legacy_value: 17 } },
  }, expect.objectContaining({ client: expect.anything() }));
  expect(list).toHaveBeenCalledTimes(2);
});

it("toggles and removes a rule from the list with confirmation and refreshed query data", async () => {
  let rules = [{ id: "manage-test", enabled: true, trigger: { sourceDeviceId: "orangepi-monitor", outputChannel: "telemetry" as const }, action: { targetDeviceId: "cyd-painel", commandType: "render_system_status", parameters: {} }, updatedAt: "2026-10-01T00:00:00Z" }];
  vi.spyOn(deviceApi, "listAutomationRulesV2").mockImplementation(async () => rules);
  const toggle = vi.spyOn(deviceApi, "setAutomationRuleEnabledV2").mockImplementation(async (ruleId, enabled) => {
    rules = rules.map((rule) => rule.id === ruleId ? { ...rule, enabled } : rule);
    return rules[0];
  });
  const remove = vi.spyOn(deviceApi, "removeAutomationRuleV2").mockImplementation(async (ruleId) => { rules = rules.filter((rule) => rule.id !== ruleId); });
  await open("/automations");
  expect((await screen.findByRole("link", { name: "manage-test" })).parentElement).toHaveClass("resource-item-flow");
  fireEvent.click(await screen.findByRole("switch", { name: "Desabilitar manage-test" }));
  await screen.findByRole("switch", { name: "Habilitar manage-test" });
  expect(toggle).toHaveBeenCalledWith("manage-test", false);
  fireEvent.click(screen.getByRole("button", { name: "Remover manage-test" }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar remoção" }));
  await waitFor(() => expect(remove).toHaveBeenCalledWith("manage-test"));
  await waitFor(() => expect(screen.queryByRole("link", { name: "manage-test" })).not.toBeInTheDocument());
});

it("shows a remove failure inside the open confirmation dialog", async () => {
  vi.spyOn(deviceApi, "listAutomationRulesV2").mockResolvedValue([{ id: "remove-error", enabled: true, trigger: { sourceDeviceId: "orangepi-monitor", outputChannel: "telemetry" }, action: { targetDeviceId: "cyd-painel", commandType: "render_system_status", parameters: {} }, updatedAt: "2026-10-01T00:00:00Z" }]);
  vi.spyOn(deviceApi, "removeAutomationRuleV2").mockRejectedValue(new Error("Gateway indisponível"));
  await open("/automations");
  fireEvent.click(await screen.findByRole("button", { name: "Remover remove-error" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar remoção" }));
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Gateway indisponível");
  expect(alert.closest('[role="dialog"]')).toBeInTheDocument();
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
