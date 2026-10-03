import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { OrangePiMetrics } from "@/components/orange-pi-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHera } from "@/context/hera-context";
import { formatDate, formatNumber } from "@/lib/format";

export function TelemetryCard({ deviceId, showDeviceLink = false, dashboard = false }: { deviceId: string; showDeviceLink?: boolean; dashboard?: boolean }) {
  const { telemetry } = useHera();
  const entry = telemetry.data?.find((item) => item.device.deviceId === deviceId);
  const snapshot = entry?.snapshot;
  const error = telemetry.error ?? entry?.error;
  const isOrangePi = dashboard && entry?.device.manifest.manifest_id === "orangepi-monitor";

  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="size-4" />
      {isOrangePi ? <span>Orange Pi ·</span> : null}
      {showDeviceLink ? <Link to="/devices/$deviceId" params={{ deviceId }} className="hover:underline">{deviceId}</Link> : "Telemetria"}
    </CardTitle>{isOrangePi ? <p className="text-sm text-muted-foreground">Monitoramento do sistema pelo Theia</p> : null}</CardHeader>
    <CardContent className="space-y-3">
      {telemetry.loading && !entry ? <Skeleton className="h-20" aria-label="Carregando telemetria" /> : null}
      {error ? <p role="alert" className="text-sm text-destructive">Não foi possível atualizar a telemetria: {error}</p> : null}
      {snapshot?.available ? <>
        {error ? <p className="text-xs text-muted-foreground">Exibindo os últimos dados disponíveis.</p> : null}
        {isOrangePi ? <OrangePiMetrics fields={snapshot.fields ?? {}} /> : <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(snapshot.fields ?? {}).map(([name, value]) => <div key={name}>
            <dt className="break-all text-muted-foreground">{name}</dt>
            <dd className="mt-0.5 break-words font-medium">{typeof value === "number" ? formatNumber(value) : typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
          </div>)}
        </dl>}
        <p className="text-xs text-muted-foreground">Último valor recebido em {formatDate(snapshot.timestamp)}.</p>
      </> : null}
      {!telemetry.loading && !error && !snapshot?.available ? <p className="text-sm text-muted-foreground">Sem dados de telemetria desde a última inicialização do gateway.</p> : null}
    </CardContent>
  </Card>;
}
