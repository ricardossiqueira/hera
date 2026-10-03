import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearCredentials, setCredentials } from "@/api/auth";
import { router } from "@/router";
import * as deviceApi from "@/api/device-v2";
import { getStatus, type GatewayStatus } from "@/api/gateway";

vi.mock("@/api/gateway", () => ({ getStatus: vi.fn().mockResolvedValue({ mqttConnected: true }), getQueueSummary: vi.fn().mockResolvedValue({}) }));
// Canvas geometry belongs to React Flow; exercise route/data wiring in jsdom.
vi.mock("@/components/automation-flow/rule-canvas", () => ({ RuleCanvas: ({ eventData, conditionData }: { eventData: { outputChannel: string }; conditionData: { mode: string } }) => <div data-testid="canvas">{eventData.outputChannel} {conditionData.mode}</div> }));

const runtimeStatus: GatewayStatus = {
  started: true, mqttConnected: true, subscriptions: 5, acceptedMessages: "474", rejectedMessages: "3",
  localRoutesPublished: "0", localRoutesFailed: "0", outboxStored: "0", outboxDiscarded: "0", outboxFailed: "0",
};

beforeEach(() => {
  setCredentials("operator", "test-password");
  vi.stubEnv("VITE_DEVICE_V2_MOCKS", "true"); vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.mocked(getStatus).mockResolvedValue({ ...runtimeStatus,
    devices: { total: 3, byActiveState: { active: 3 } },
    discovery: { total: 3, online: 2, offline: 1, byStatus: { ready_to_register: 2, offline: 1 } },
  });
});
afterEach(() => { cleanup(); clearCredentials(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function open(path: string) {
  const testRouter = createRouter({ routeTree: router.routeTree, history: createMemoryHistory({ initialEntries: [path] }) });
  render(<RouterProvider router={testRouter} />);
  await act(async () => { await testRouter.load(); });
  return testRouter;
}

it("opens the public landing without starting gateway requests and enters through login", async () => {
  clearCredentials();
  vi.mocked(getStatus).mockClear();
  const devices = vi.spyOn(deviceApi, "listDevicesV2");
  const testRouter = await open("/");
  expect(await screen.findByRole("heading", { name: /Seus dispositivos\.\s*Uma só visão\./ })).toBeInTheDocument();
  expect(getStatus).not.toHaveBeenCalled();
  expect(devices).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: "Abrir Hera" }));
  expect(await screen.findByLabelText("Usuário")).toBeInTheDocument();
  expect(testRouter.state.location.pathname).toBe("/overview");
  expect(getStatus).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: "Voltar ao início" }));
  expect(await screen.findByRole("heading", { name: /Seus dispositivos\.\s*Uma só visão\./ })).toBeInTheDocument();
});

it.each(["/overview", "/devices", "/devices/orangepi-monitor", "/discovery", "/discovery/esp32c3-42a9", "/automations", "/automations/new", "/automations/orangepi-to-cyd", "/queue", "/settings"])("protects direct access to %s before mounting gateway data", async (path) => {
  clearCredentials();
  vi.mocked(getStatus).mockClear();
  const devices = vi.spyOn(deviceApi, "listDevicesV2");
  await open(path);
  expect(await screen.findByLabelText("Usuário")).toBeInTheDocument();
  expect(getStatus).not.toHaveBeenCalled();
  expect(devices).not.toHaveBeenCalled();
});

it("keeps the requested route through login and gates it again after logout", async () => {
  clearCredentials();
  const testRouter = await open("/devices");
  fireEvent.change(await screen.findByLabelText("Usuário"), { target: { value: "operator" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "test-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  expect(await screen.findByText("orangepi-001")).toBeInTheDocument();
  expect(testRouter.state.location.pathname).toBe("/devices");
  fireEvent.click(screen.getByRole("button", { name: "Sair" }));
  expect(await screen.findByLabelText("Usuário")).toBeInTheDocument();
  expect(screen.queryByText("orangepi-001")).not.toBeInTheDocument();
});

it("lets visitors explore previews and mobile navigation without gateway calls", async () => {
  clearCredentials();
  vi.mocked(getStatus).mockClear();
  await open("/");
  fireEvent.click(await screen.findByRole("button", { name: /Conecte eventos a ações/ }));
  expect(screen.getByRole("region", { name: /Conecte eventos a ações/ })).toHaveTextContent("Telemetria recebida");
  fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
  expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(screen.getByRole("link", { name: "Como funciona" }));
  expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
  expect(getStatus).not.toHaveBeenCalled();
});

it("shows telemetry on overview and keeps Discovery separate in navigation", async () => {
  await open("/overview");
  expect(await screen.findByText("CPU")).toBeInTheDocument();
  expect(screen.getByText("12,5%")).toBeInTheDocument();
  expect(screen.getByText("Monitoramento do sistema pelo Theia")).toBeInTheDocument();
  expect(screen.getByText("Registrados").parentElement).toHaveTextContent("3");
  expect(screen.getByText("Ativos no gateway").parentElement).toHaveTextContent("3");
  const nav = screen.getByRole("navigation");
  expect(within(nav).getByRole("link", { name: "Discovery" })).toHaveAttribute("href", "/discovery");
  expect(screen.getByRole("link", { name: "Hera" })).toBeInTheDocument();
});

it("keeps Theia open on overview and remembers its collapsed state on other pages without extra polling", async () => {
  const telemetry = vi.spyOn(deviceApi, "getDeviceTelemetryV2");
  const testRouter = await open("/overview");
  const monitor = screen.getByRole("complementary", { name: "Monitor Theia" });
  expect(await within(monitor).findByText("12,5%")).toBeVisible();
  expect(within(screen.getByRole("main")).queryByText("CPU")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Recolher monitor Theia" })).not.toBeInTheDocument();
  const requests = telemetry.mock.calls.length;
  await act(async () => { await testRouter.navigate({ to: "/devices" }); });
  fireEvent.click(screen.getByRole("button", { name: "Recolher monitor Theia" }));
  expect(screen.getByRole("button", { name: "Expandir monitor Theia" })).toHaveAttribute("aria-expanded", "false");
  expect(within(monitor).getByText("12,5%")).not.toBeVisible();
  await act(async () => { await testRouter.navigate({ to: "/settings" }); });
  expect(screen.getByRole("button", { name: "Expandir monitor Theia" })).toBeInTheDocument();
  await act(async () => { await testRouter.navigate({ to: "/overview" }); });
  expect(within(monitor).getByText("12,5%")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Recolher monitor Theia" })).not.toBeInTheDocument();
  await act(async () => { await testRouter.navigate({ to: "/devices" }); });
  fireEvent.click(screen.getByRole("button", { name: "Expandir monitor Theia" }));
  expect(within(monitor).getByText("12,5%")).toBeVisible();
  expect(telemetry).toHaveBeenCalledTimes(requests);
});

it("shows an unavailable Theia monitor instead of fabricated metrics", async () => {
  vi.spyOn(deviceApi, "listDevicesV2").mockResolvedValue([]);
  await open("/overview");
  const monitor = screen.getByRole("complementary", { name: "Monitor Theia" });
  expect(await within(monitor).findByText(/Nenhum monitor Theia disponível/)).toBeInTheDocument();
  expect(within(monitor).queryByText("CPU")).not.toBeInTheDocument();
});

it("shows per-device telemetry failures in the shared Theia monitor", async () => {
  vi.spyOn(deviceApi, "getDeviceTelemetryV2").mockRejectedValue(new Error("telemetry unavailable"));
  await open("/devices");
  const monitor = screen.getByRole("complementary", { name: "Monitor Theia" });
  expect(await within(monitor).findByRole("alert")).toHaveTextContent("telemetry unavailable");
  expect(within(monitor).queryByText("12,5%")).not.toBeInTheDocument();
});

it("opens a device from a non-link cell and reuses telemetry in details", async () => {
  const testRouter = await open("/devices");
  fireEvent.click(await screen.findByText("orangepi-001"));
  await waitFor(() => expect(testRouter.state.location.pathname).toBe("/devices/orangepi-monitor"));
  expect(await screen.findByText("12,5")).toBeInTheDocument();
});

it("keeps the connection pending until the first status response", async () => {
  let finish!: (value: GatewayStatus) => void;
  vi.mocked(getStatus).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  await open("/overview");
  expect(screen.getByText("Verificando gateway")).toBeInTheDocument();
  expect(screen.queryByText("Gateway indisponível")).not.toBeInTheDocument();
  await act(async () => { finish(runtimeStatus); });
  expect(await screen.findByText("Gateway online")).toBeInTheDocument();
});

it("retains the last counters but marks API unavailable after a refresh failure", async () => {
  await open("/overview");
  await screen.findByText("Gateway online");
  vi.mocked(getStatus).mockRejectedValue(new Error("connection lost"));
  fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
  expect(await screen.findByText("Gateway indisponível")).toBeInTheDocument();
  expect(screen.getByText("API").parentElement).toHaveTextContent("Indisponível");
  expect(screen.getByText("Registrados").parentElement).toHaveTextContent("3");
  expect(screen.getByText(/MQTT e contadores abaixo refletem a última consulta/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Atualizar agora" })).toBeEnabled();
});

it("closes mobile navigation on selection and marks the device section active on a deep link", async () => {
  const testRouter = await open("/overview");
  fireEvent.click(screen.getByRole("button", { name: "Abrir navegação" }));
  const menu = await screen.findByRole("dialog");
  fireEvent.click(within(menu).getByRole("link", { name: "Dispositivos" }));
  await waitFor(() => expect(testRouter.state.location.pathname).toBe("/devices"));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await act(async () => { await testRouter.navigate({ to: "/devices/$deviceId", params: { deviceId: "orangepi-monitor" } }); });
  expect(within(screen.getByRole("navigation")).getByRole("link", { name: "Dispositivos" })).toHaveAttribute("aria-current", "page");
});

it("opens discovery inspection from a row", async () => {
  const testRouter = await open("/discovery");
  const uid = await screen.findByRole("link", { name: "esp32c3-42a9" });
  expect(uid).toHaveAttribute("href", "/discovery/esp32c3-42a9");
  expect(screen.queryByText("Inspecionar")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("192.168.15.43:8080"));
  await waitFor(() => expect(testRouter.state.location.pathname).toBe("/discovery/esp32c3-42a9"));
  expect(await screen.findByText("Registro")).toBeInTheDocument();
});

it.each([
  { status: "rejected" as const, manifest: undefined },
  { status: "rejected" as const, manifest: deviceApi.deviceV2Fixtures.ledManifest },
  { status: "ready_to_register" as const, manifest: undefined },
])("renders incomplete or rejected discovery safely ($status, $manifest)", async ({ status, manifest }) => {
  const diagnostic = 'Get "http://192.168.15.211:8080/v1/device-info": dial tcp 192.168.15.211:8080: connect: no route to host';
  vi.spyOn(deviceApi, "listDiscoveryV2").mockResolvedValue([{
    deviceUid: "esp32c3-a46ae1bbc784", address: "192.168.15.211", port: 8080,
    model: "esp32c3-led", firmwareVersion: "0.1.0", manifest,
    manifestSha256: "6268eec56109b74487ab7da63af72b04a37c91dea23e2e6cf73408912ee37389",
    pairingRequired: false, status, trust: "unknown", lastSeenAt: "2026-10-03T13:05:05Z", diagnostic,
  }]);
  const register = vi.spyOn(deviceApi, "registerDiscoveredDeviceV2");
  await open("/discovery/esp32c3-a46ae1bbc784");
  expect(await screen.findByText(diagnostic)).toBeInTheDocument();
  expect(screen.getByText(/Registro indisponível/)).toBeInTheDocument();
  if (!manifest) expect(screen.getByText("Manifest indisponível")).toBeInTheDocument();
  expect(screen.getByRole("checkbox")).toBeDisabled();
  const button = screen.getByRole("button", { name: "Registrar device" });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(register).not.toHaveBeenCalled();
});

it.each(["esp32c3-42a9", "cyd-7781"])("still allows reviewed manifests through the registration flow for %s", async (uid) => {
  await open(`/discovery/${uid}`);
  const checkbox = await screen.findByRole("checkbox");
  expect(checkbox).toBeEnabled();
  expect(screen.getByRole("button", { name: "Registrar device" })).toBeDisabled();
  fireEvent.click(checkbox);
  expect(screen.getByRole("button", { name: "Registrar device" })).toBeEnabled();
});

it("shows expired discovery instead of loading forever when the UID is missing", async () => {
  await open("/discovery/missing");
  expect(await screen.findByText("O anúncio expirou.")).toBeInTheDocument();
  expect(screen.queryByText("Carregando anúncio…")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Voltar para discovery" })).toHaveAttribute("href", "/discovery");
});

it("uses GetStatus breakdowns even when the device list contains different counts", async () => {
  vi.mocked(getStatus).mockResolvedValue({ ...runtimeStatus,
    devices: { total: 5, byActiveState: { active: 2, offline: 1, pending: 1, failed: 1 } },
    discovery: { total: 3, online: 2, offline: 1, byStatus: { ready_to_register: 2, offline: 1 } },
  });
  vi.spyOn(deviceApi, "listDevicesV2").mockResolvedValue([]);
  await open("/overview");
  await waitFor(() => expect(screen.getByText("Registrados").parentElement).toHaveTextContent("5"));
  expect(screen.getByText("Ativos no gateway").parentElement).toHaveTextContent("2");
  expect(screen.getByText("Descobertos").parentElement).toHaveTextContent("3");
  expect(screen.getByText("Online no Discovery").parentElement).toHaveTextContent("2");
  expect(screen.getByText("Offline no Discovery").parentElement).toHaveTextContent("1");
  expect(screen.getByText("Precisam de atenção").parentElement).toHaveTextContent("2");
});

it("does not present a GetStatus failure as zero registered devices", async () => {
  vi.mocked(getStatus).mockRejectedValue(new Error("registry unavailable"));
  await open("/overview");
  await waitFor(() => expect(screen.getByText("Registrados").parentElement).toHaveTextContent("—"));
  expect(screen.getByText(/Não foi possível atualizar o resumo de dispositivos/)).toBeInTheDocument();
});

it("handles protobuf omitted zeros and older gateways without breakdowns", async () => {
  vi.mocked(getStatus).mockResolvedValue({ ...runtimeStatus, devices: {}, discovery: {} });
  await open("/overview");
  await waitFor(() => expect(screen.getByText("Registrados").parentElement).toHaveTextContent("0"));
  expect(screen.getByText("Offline no Discovery").parentElement).toHaveTextContent("0");
  vi.mocked(getStatus).mockResolvedValue(runtimeStatus);
  fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
  await waitFor(() => expect(screen.getByText("Registrados").parentElement).toHaveTextContent("—"));
  expect(screen.getByText("O gateway ainda não disponibilizou o resumo de dispositivos.")).toBeInTheDocument();
});

it("opens an automation from its row with read-only details", async () => {
  const testRouter = await open("/automations");
  fireEvent.click(await screen.findByText("Sempre"));
  await waitFor(() => expect(testRouter.state.location.pathname).toBe("/automations/orangepi-to-cyd"));
  expect(await screen.findByTestId("canvas")).toHaveTextContent("telemetry read_only");
  expect(screen.getByRole("heading", { name: "Parâmetros do comando" })).toBeInTheDocument();
});

it.each([
  { path: "/devices", label: "Buscar dispositivos", query: "orangepi-001", result: "orangepi-monitor", other: "led-sala" },
  { path: "/discovery", label: "Buscar por dispositivo, UID ou endereço", query: "192.168.15.43", result: "esp32c3-42a9", other: "cyd-7781" },
  { path: "/automations", label: "Buscar por automação, dispositivo ou comando", query: "render_system_status", result: "orangepi-to-cyd", other: undefined },
])("searches real data and restores results on $path", async ({ path, label, query, result, other }) => {
  await open(path);
  await screen.findByRole("link", { name: result });
  const search = screen.getByRole("searchbox", { name: label });
  fireEvent.change(search, { target: { value: query } });
  expect(screen.getByRole("link", { name: result })).toBeInTheDocument();
  if (other) expect(screen.queryByRole("link", { name: other })).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "no-such-item" } });
  expect(screen.getByText("Nenhum resultado para esta busca")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
  expect(search).toHaveValue("");
  expect(screen.getByRole("link", { name: result })).toBeInTheDocument();
  if (other) expect(screen.getByRole("link", { name: other })).toBeInTheDocument();
});

it("keeps rejected announcements without manifests visible and searchable in Discovery", async () => {
  vi.spyOn(deviceApi, "listDiscoveryV2").mockResolvedValue([{
    deviceUid: "esp32-unreachable", address: "192.168.15.211", port: 8080, model: "esp32c3-led", firmwareVersion: "0.1.0",
    manifestSha256: "6268eec56109b74487ab7da63af72b04a37c91dea23e2e6cf73408912ee37389", status: "rejected", trust: "unknown",
    pairingRequired: false, lastSeenAt: "2026-10-03T13:05:05Z", diagnostic: "no route to host",
  }]);
  await open("/discovery");
  expect(await screen.findByText("Inspeção indisponível")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "rejeitado" } });
  fireEvent.click(screen.getByRole("link", { name: "esp32-unreachable" }));
  expect(await screen.findByText("no route to host")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Registrar device" })).toBeDisabled();
});

it("retains searchable automation rows when a refresh fails", async () => {
  const list = vi.spyOn(deviceApi, "listAutomationRulesV2");
  await open("/automations");
  await screen.findByRole("link", { name: "orangepi-to-cyd" });
  list.mockRejectedValue(new Error("Gateway indisponível"));
  fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Exibindo a última consulta disponível.");
  expect(screen.getByRole("link", { name: "orangepi-to-cyd" })).toBeInTheDocument();
});

it.each([
  ["/devices/discovery", "/discovery"],
  ["/devices/discovery/esp32c3-42a9", "/discovery/esp32c3-42a9"],
])("redirects %s to %s", async (oldPath, newPath) => {
  const testRouter = await open(oldPath);
  await waitFor(() => expect(testRouter.state.location.pathname).toBe(newPath));
});

it("reports missing automation details with a way back", async () => {
  await open("/automations/missing");
  expect(await screen.findByRole("alert")).toHaveTextContent("Automação não encontrada.");
  expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute("href", "/automations");
});
