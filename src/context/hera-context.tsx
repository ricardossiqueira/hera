import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getQueueSummary, getStatus, type GatewayStatus, type QueueSummary } from "@/api/gateway";
import { getDeviceTelemetryV2, listDevicesV2, type RegisteredDeviceV2, type TelemetrySnapshotV2 } from "@/api/device-v2";

export type Resource<T> = { data?: T; error?: string; loading: boolean; updatedAt?: Date };

export type Issue = { id: number; message: string; at: Date };

export type DeviceTelemetry = { device: RegisteredDeviceV2; snapshot?: TelemetrySnapshotV2; error?: string };

async function loadDeviceOverview() {
  const devices = await listDevicesV2();
  const telemetry: DeviceTelemetry[] = await Promise.all(devices
    .filter((device) => device.manifest.mqtt.publish.some((output) => output.channel === "telemetry"))
    .map(async (device) => {
      try {
        return { device, snapshot: await getDeviceTelemetryV2(device.deviceId) };
      } catch (error) {
        return { device, error: error instanceof Error ? error.message : "Falha ao carregar telemetria." };
      }
    }));
  return { devices, telemetry };
}

type HeraContextValue = {
  status: Resource<GatewayStatus>;
  queueSummary: Resource<QueueSummary>;
  devices: Resource<RegisteredDeviceV2[]>;
  refreshDevices: () => Promise<void>;
  telemetry: Resource<DeviceTelemetry[]>;
  refreshTelemetry: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshQueueSummary: () => Promise<void>;
  reportError: (message: string) => void;
  issues: Issue[];
};

const HeraContext = createContext<HeraContextValue | undefined>(undefined);

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

export function HeraProvider({ children }: { children: ReactNode }) {
  const [status, refreshStatus] = useResource(getStatus);
  const [queueSummary, refreshQueueSummary] = useResource(getQueueSummary);
  const [deviceOverview, refreshDevices] = useResource(loadDeviceOverview);
  const devices = { ...deviceOverview, data: deviceOverview.data?.devices };
  const telemetry = { ...deviceOverview, data: deviceOverview.data?.telemetry };
  const [issues, setIssues] = useState<Issue[]>([]);

  // Feeds both the header's issues popover (persistent history for this tab)
  // and an immediate toast - see docs/spec.md decisions plus the redesign
  // plan: `issues` used to be collected and never shown anywhere.
  const reportError = useCallback((message: string) => {
    setIssues((current) => [{ id: nextIssueId++, message, at: new Date() }, ...current].slice(0, 20));
    toast.error(message);
  }, []);

  useEffect(() => { if (status.error) reportError("Status: " + status.error); }, [reportError, status.error]);
  useEffect(() => { if (queueSummary.error) reportError("Fila: " + queueSummary.error); }, [queueSummary.error, reportError]);

  const value: HeraContextValue = {
    status, queueSummary, devices, telemetry,
    refreshStatus, refreshQueueSummary, refreshDevices, refreshTelemetry: refreshDevices,
    reportError, issues,
  };
  return <HeraContext.Provider value={value}>{children}</HeraContext.Provider>;
}

export function useHera() {
  const value = useContext(HeraContext);
  if (!value) throw new Error("Contexto do Hera não disponível.");
  return value;
}
