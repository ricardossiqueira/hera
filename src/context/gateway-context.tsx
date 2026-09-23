import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { type Device, type DeviceTelemetry, GatewayApiError, type GatewayEvent, type GatewayStatus, getDeviceTelemetry, getQueueSummary, getRecentEvents, getStatus, type Inconsistency, listDeviceCommands, listDevices, listInconsistencies, type QueueSummary } from "@/api/gateway";

// orangepi-monitor's device_id is fixed - configs/config.example.yaml
// doesn't make it configurable, and it's the same ID the "Registrar
// dispositivo existente" flow in pages/devices/new.tsx uses.
const ORANGE_PI_DEVICE_ID = "orangepi-monitor";

// Not registered yet is not an error (docs/api-v1.md's GetDeviceTelemetry:
// an unknown device_id is the only InvalidArgument this call can produce),
// so it resolves to available:false instead of throwing - same "não inventa
// dados" spirit as the Queue page, and keeps a fresh install from spamming
// the issues popover/toast every 10s poll before the device is registered.
async function loadOrangePiTelemetry(): Promise<DeviceTelemetry> {
  try {
    return await getDeviceTelemetry(ORANGE_PI_DEVICE_ID);
  } catch (error) {
    if (error instanceof GatewayApiError && error.code === "invalid_argument") {
      return { deviceId: ORANGE_PI_DEVICE_ID, available: false };
    }
    throw error;
  }
}

export type Resource<T> = { data?: T; error?: string; loading: boolean; updatedAt?: Date };

export type Issue = { id: number; message: string; at: Date };

type GatewayContextValue = {
  status: Resource<GatewayStatus>;
  devices: Resource<Device[]>;
  orangePiTelemetry: Resource<DeviceTelemetry>;
  queueSummary: Resource<QueueSummary>;
  recentEvents: Resource<GatewayEvent[]>;
  inconsistencies: Resource<Inconsistency[]>;
  refreshStatus: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshQueueSummary: () => Promise<void>;
  refreshRecentEvents: () => Promise<void>;
  refreshInconsistencies: () => Promise<void>;
  reportError: (message: string) => void;
  issues: Issue[];
};

const GatewayContext = createContext<GatewayContextValue | undefined>(undefined);

function useResource<T>(loader: () => Promise<T>) {
  const [resource, setResource] = useState<Resource<T>>({ loading: true });
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setResource((current) => ({ ...current, loading: current.data === undefined, error: undefined }));
    try {
      const data = await loader();
      setResource({ data, loading: false, updatedAt: new Date() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado.";
      setResource((current) => ({ ...current, loading: false, error: message }));
    } finally {
      running.current = false;
    }
  }, [loader]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return [resource, refresh] as const;
}

let nextIssueId = 0;

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [status, refreshStatus] = useResource(getStatus);
  const [devices, refreshDevices] = useResource(listDevices);
  const [orangePiTelemetry] = useResource(loadOrangePiTelemetry);
  const [queueSummary, refreshQueueSummary] = useResource(getQueueSummary);
  const [recentEvents, refreshRecentEvents] = useResource(getRecentEvents);
  const [inconsistencies, refreshInconsistencies] = useResource(listInconsistencies);
  const [issues, setIssues] = useState<Issue[]>([]);

  // Feeds both the header's issues popover (persistent history for this tab)
  // and an immediate toast - see docs/spec.md decisions plus the redesign
  // plan: `issues` used to be collected and never shown anywhere.
  const reportError = useCallback((message: string) => {
    setIssues((current) => [{ id: nextIssueId++, message, at: new Date() }, ...current].slice(0, 20));
    toast.error(message);
  }, []);

  useEffect(() => { if (status.error) reportError("Status: " + status.error); }, [reportError, status.error]);
  useEffect(() => { if (devices.error) reportError("Dispositivos: " + devices.error); }, [devices.error, reportError]);
  useEffect(() => { if (queueSummary.error) reportError("Fila: " + queueSummary.error); }, [queueSummary.error, reportError]);
  useEffect(() => { if (recentEvents.error) reportError("Atividade recente: " + recentEvents.error); }, [recentEvents.error, reportError]);
  useEffect(() => { if (inconsistencies.error) reportError("Inconsistências: " + inconsistencies.error); }, [inconsistencies.error, reportError]);

  const value: GatewayContextValue = {
    status, devices, orangePiTelemetry, queueSummary, recentEvents, inconsistencies,
    refreshStatus, refreshDevices, refreshQueueSummary, refreshRecentEvents, refreshInconsistencies,
    reportError, issues,
  };
  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}

export function useGateway() {
  const value = useContext(GatewayContext);
  if (!value) throw new Error("Contexto do gateway não disponível.");
  return value;
}

export function useDeviceCommands(deviceId?: string) {
  const [resource, setResource] = useState<Resource<string[]>>({ loading: false });

  useEffect(() => {
    if (!deviceId) {
      setResource({ loading: false });
      return;
    }

    let active = true;
    setResource({ loading: true });
    void listDeviceCommands(deviceId)
      .then((response) => {
        if (active) setResource({ data: response.commands.map((command) => command.type), loading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResource({
          loading: false,
          error: error instanceof Error ? error.message : "Erro inesperado ao consultar comandos.",
        });
      });

    return () => { active = false; };
  }, [deviceId]);

  return resource;
}
