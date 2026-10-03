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

it("opens a device from a non-link cell and reuses telemetry in details", async () => {
  const testRouter = await open("/devices");
  fireEvent.click(await screen.findByText("orangepi-001"));
  await waitFor(() => expect(testRouter.state.location.pathname).toBe("/devices/orangepi-monitor"));
  expect(await screen.findByText("12,5")).toBeInTheDocument();
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
