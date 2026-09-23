import { Activity, Cpu, Inbox, Radio, RefreshCw, Thermometer } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGateway } from "@/context/gateway-context";
import { formatDate, formatNumber, formatUptime } from "@/lib/format";

function OrangePiCard() {
  const { orangePiTelemetry } = useGateway();
  const telemetry = orangePiTelemetry.data;

  // Not registered yet, or no reading since the gateway started: this is
  // not an error (see gateway-context's loadOrangePiTelemetry), so the
  // card simply doesn't render instead of showing a scary empty state.
  if (!telemetry?.available || !telemetry.payload) {
    if (orangePiTelemetry.loading && !telemetry) {
      return <Skeleton className="h-40" />;
    }
    return null;
  }

  const { payload } = telemetry;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Cpu className="size-4" /> Orange Pi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">CPU</span><span>{payload.cpu_pct?.toFixed(1) ?? "—"}%</span></div>
            <Progress value={payload.cpu_pct ?? 0} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Memória</span><span>{formatNumber(payload.memory_used_mb)} / {formatNumber(payload.memory_total_mb)} MB</span></div>
            <Progress value={payload.memory_total_mb ? (100 * (payload.memory_used_mb ?? 0)) / payload.memory_total_mb : 0} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Disco</span><span>{payload.disk_used_pct?.toFixed(1) ?? "—"}%</span></div>
            <Progress value={payload.disk_used_pct ?? 0} />
          </div>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted-foreground">Carga (1 min)</dt><dd className="mt-0.5">{payload.load_1?.toFixed(2) ?? "—"}</dd></div>
          {payload.temperature_c !== undefined ? (
            <div><dt className="flex items-center gap-1 text-muted-foreground"><Thermometer className="size-3.5" /> Temperatura</dt><dd className="mt-0.5">{payload.temperature_c.toFixed(1)} °C</dd></div>
          ) : null}
          <div><dt className="text-muted-foreground">Uptime</dt><dd className="mt-0.5">{formatUptime(payload.uptime_s)}</dd></div>
          <div><dt className="text-muted-foreground">Última leitura</dt><dd className="mt-0.5">{formatDate(telemetry.observedAt)}</dd></div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function Overview() {
  const { status, refreshStatus } = useGateway();
  const data = status.data;

  return (
    <>
      <PageHeading
        title="Visão geral"
        description="Estado operacional atual do gateway. A página atualiza automaticamente a cada 10 segundos."
        action={
          <Button onClick={() => void refreshStatus()}>
            <RefreshCw /> Atualizar agora
          </Button>
        }
      />
      {status.loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : null}
      {status.error && !data ? (
        <Card>
          <CardContent>
            <p className="font-medium text-destructive">Não foi possível carregar o status.</p>
            <p className="mt-1 text-sm text-destructive/80">{status.error}</p>
          </CardContent>
        </Card>
      ) : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Activity className="size-4" /> API</p>
                <p className="text-2xl font-semibold text-success">Online</p>
                <p className="text-xs text-muted-foreground">A API respondeu à última consulta.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Radio className="size-4" /> MQTT</p>
                <Badge variant={data.mqttConnected ? "success" : "destructive"} className="text-sm">
                  {data.mqttConnected ? "Conectado" : "Desconectado"}
                </Badge>
                <p className="text-xs text-muted-foreground">{data.subscriptions} subscriptions ativas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Mensagens aceitas</p>
                <p className="text-2xl font-semibold">{formatNumber(data.acceptedMessages)}</p>
                <p className="text-xs text-muted-foreground">Rejeitadas: {formatNumber(data.rejectedMessages)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Inbox className="size-4" /> Outbox armazenada</p>
                <p className="text-2xl font-semibold">{formatNumber(data.outboxStored)}</p>
                <p className="text-xs text-muted-foreground">Descartadas: {formatNumber(data.outboxDiscarded)}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Detalhes do runtime</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="text-muted-foreground">Iniciado em</dt><dd className="mt-0.5">{formatDate(data.startedAt)}</dd></div>
                <div><dt className="text-muted-foreground">Rotas locais publicadas</dt><dd className="mt-0.5">{formatNumber(data.localRoutesPublished)}</dd></div>
                <div><dt className="text-muted-foreground">Falhas em rotas locais</dt><dd className="mt-0.5">{formatNumber(data.localRoutesFailed)}</dd></div>
                <div><dt className="text-muted-foreground">Falhas na outbox</dt><dd className="mt-0.5">{formatNumber(data.outboxFailed)}</dd></div>
                <div><dt className="text-muted-foreground">Gateway iniciado</dt><dd className="mt-0.5">{data.started ? "Sim" : "Não"}</dd></div>
              </dl>
            </CardContent>
          </Card>
          <div className="mt-4"><OrangePiCard /></div>
        </>
      ) : null}
    </>
  );
}
