import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getQueueSummary, getStatus, type GatewayStatus, type QueueSummary } from "@/api/gateway";

export type Resource<T> = { data?: T; error?: string; loading: boolean; updatedAt?: Date };

export type Issue = { id: number; message: string; at: Date };

type GatewayContextValue = {
  status: Resource<GatewayStatus>;
  queueSummary: Resource<QueueSummary>;
  refreshStatus: () => Promise<void>;
  refreshQueueSummary: () => Promise<void>;
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
  const [queueSummary, refreshQueueSummary] = useResource(getQueueSummary);
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

  const value: GatewayContextValue = {
    status, queueSummary,
    refreshStatus, refreshQueueSummary,
    reportError, issues,
  };
  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}

export function useGateway() {
  const value = useContext(GatewayContext);
  if (!value) throw new Error("Contexto do gateway não disponível.");
  return value;
}
