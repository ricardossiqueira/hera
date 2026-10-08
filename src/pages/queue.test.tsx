import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getRecentEvents, type GatewayEvent, type RecentEventsPage } from "@/api/gateway";
import { listDevicesV2 } from "@/api/device-v2";
import { HeraProvider } from "@/context/hera-context";
import { Queue } from "./queue";

vi.mock("@/api/gateway", () => ({
  getStatus: vi.fn().mockResolvedValue({}),
  getQueueSummary: vi.fn().mockResolvedValue({ pendingMessages: "0", pendingBytes: "0" }),
  getRecentEvents: vi.fn(),
}));
vi.mock("@/api/device-v2", () => ({ listDevicesV2: vi.fn().mockResolvedValue([]), getDeviceTelemetryV2: vi.fn() }));
// Exercise filter/query wiring independently of Radix's popup positioning.
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => <select value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

const event = (sequence: string, detail: string): GatewayEvent => ({ sequence, detail, timestamp: "2026-10-08T12:00:00Z", deviceId: "sensor", topic: "devices/sensor/telemetry", kind: "telemetry", outcome: "accepted" });
const firstPage = { events: [event("9007199254740993", "Evento recente")], hasMore: true };
const activity = () => within(screen.getByText("Atividade recente").closest('[data-slot="card"]') as HTMLElement);

beforeEach(() => { vi.mocked(getRecentEvents).mockReset().mockResolvedValue(firstPage); vi.mocked(listDevicesV2).mockClear(); });
afterEach(cleanup);

it("renders table columns and uses the exact gateway cursor, retaining a way back from an empty page", async () => {
  render(<HeraProvider><Queue /></HeraProvider>);
  expect(await screen.findByRole("cell", { name: "Evento recente" })).toBeInTheDocument();
  expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Hora", "Device", "Kind", "Resultado", "Detalhe"]);
  expect(listDevicesV2).toHaveBeenCalledTimes(1);
  expect(getRecentEvents).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 15, beforeSequence: undefined }));
  vi.mocked(getRecentEvents).mockResolvedValueOnce({ events: [], hasMore: false });
  fireEvent.click(activity().getByRole("button", { name: "Próxima" }));
  await screen.findByText("Nenhuma atividade para esse filtro.");
  expect(getRecentEvents).toHaveBeenLastCalledWith(expect.objectContaining({ beforeSequence: "9007199254740993" }));
  expect(activity().getByRole("button", { name: "Próxima" })).toBeDisabled();
  fireEvent.click(activity().getByRole("button", { name: "Anterior" }));
  expect(await screen.findByRole("cell", { name: "Evento recente" })).toBeInTheDocument();
  expect(activity().getByRole("button", { name: "Anterior" })).toBeDisabled();
});

it("resets the cursor on filter changes and ignores a late response from the previous filter", async () => {
  render(<HeraProvider><Queue /></HeraProvider>);
  await screen.findByRole("cell", { name: "Evento recente" });
  let resolvePage!: (page: RecentEventsPage) => void;
  vi.mocked(getRecentEvents).mockImplementationOnce(() => new Promise((resolve) => { resolvePage = resolve; }));
  fireEvent.click(activity().getByRole("button", { name: "Próxima" }));
  await waitFor(() => expect(getRecentEvents).toHaveBeenCalledTimes(2));
  vi.mocked(getRecentEvents).mockResolvedValueOnce({ events: [event("42", "Filtro atual")], hasMore: false });
  fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "0" } });
  await screen.findByRole("cell", { name: "Filtro atual" });
  expect(getRecentEvents).toHaveBeenLastCalledWith({ deviceId: undefined, since: undefined, limit: 15, beforeSequence: undefined });
  await act(async () => { resolvePage({ events: [event("21", "Resposta antiga")], hasMore: false }); });
  expect(screen.queryByRole("cell", { name: "Resposta antiga" })).not.toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Filtro atual" })).toBeInTheDocument();
  expect(activity().getByRole("button", { name: "Anterior" })).toBeDisabled();
});

it("keeps the last page visible and reports a failed refresh", async () => {
  render(<HeraProvider><Queue /></HeraProvider>);
  await screen.findByRole("cell", { name: "Evento recente" });
  vi.mocked(getRecentEvents).mockRejectedValueOnce(new Error("Gateway indisponível"));
  fireEvent.click(activity().getByRole("button", { name: "Atualizar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Gateway indisponível");
  expect(screen.getByRole("cell", { name: "Evento recente" })).toBeInTheDocument();
});
