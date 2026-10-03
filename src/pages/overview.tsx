import { Link } from "@tanstack/react-router";
import { Activity, AlertCircle, Cpu, Inbox, Radar, Radio, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { TelemetryCard } from "@/components/telemetry-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHera } from "@/context/hera-context";
import { formatDate, formatNumber } from "@/lib/format";

export function Overview() {
  const { status, refreshStatus, telemetry, refreshTelemetry } = useHera();
  const data = status.data;
  const devices = data?.devices;
  const discovery = data?.discovery;
  const count = (state: string) => devices ? devices.byActiveState?.[state] ?? 0 : undefined;
  const deviceStats = [
    { label: "Registrados", value: devices ? devices.total ?? 0 : undefined, icon: Cpu, note: "Dispositivos cadastrados" },
    { label: "Ativos no gateway", value: count("active"), icon: Activity, note: "Ativação concluída" },
    { label: "Precisam de atenção", value: devices ? (count("pending") ?? 0) + (count("failed") ?? 0) : undefined, icon: AlertCircle, note: "Pendentes ou com falha" },
    { label: "Descobertos", value: discovery ? discovery.total ?? 0 : undefined, icon: Radar, note: "Total de dispositivos no Discovery" },
    { label: "Online no Discovery", value: discovery ? discovery.online ?? 0 : undefined, icon: Wifi, note: "Anunciados, conforme o Discovery" },
    { label: "Offline no Discovery", value: discovery ? discovery.offline ?? 0 : undefined, icon: WifiOff, note: "Marcados como offline no Discovery" },
  ];

  return (
    <>
      <PageHeading
        title="Visão geral"
        description="Dispositivos, saúde do Orange Pi e operação do gateway. Atualização automática a cada 10 segundos."
        action={
          <Button onClick={() => void Promise.all([refreshStatus(), refreshTelemetry()])}>
            <RefreshCw /> Atualizar agora
          </Button>
        }
      />
      <section className="mb-6 space-y-3" aria-labelledby="devices-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="devices-heading" className="text-lg font-semibold">Dispositivos</h2>
          <div className="flex gap-4">
            <Link to="/devices" className="text-sm text-primary hover:underline">Ver dispositivos</Link>
            <Link to="/discovery" className="text-sm text-primary hover:underline">Ver Discovery</Link>
          </div>
        </div>
        {status.error ? <p role="alert" className="text-sm text-destructive">Não foi possível atualizar o resumo de dispositivos: {status.error}{data ? " Exibindo a última consulta." : ""}</p> : null}
        {data && (!devices || !discovery) ? <p className="text-sm text-muted-foreground">O gateway ainda não disponibilizou o resumo de dispositivos.</p> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deviceStats.map(({ label, value, icon: Icon, note }) => <Card key={label}><CardContent>
            <dl><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4" />{label}</dt>
              <dd className="my-2 text-3xl font-semibold tabular-nums">{value === undefined ? "—" : formatNumber(value)}</dd>
            </dl>
            <p className="text-xs text-muted-foreground">{note}</p>
          </CardContent></Card>)}
        </div>
        <p className="text-xs text-muted-foreground">Resumo fornecido pelo gateway. Online/offline refletem o Discovery, incluindo dispositivos ainda não registrados; não confirmam conexão MQTT.</p>
      </section>
      <section className="mb-6 space-y-4" aria-labelledby="telemetry-heading">
        <h2 id="telemetry-heading" className="text-lg font-semibold">Saúde do sistema</h2>
        {telemetry.loading && !telemetry.data ? <Skeleton className="h-64" aria-label="Carregando telemetria" /> : null}
        {telemetry.error ? <p role="alert" className="text-sm text-destructive">Não foi possível atualizar a telemetria: {telemetry.error}</p> : null}
        {!telemetry.error && telemetry.data?.length === 0 ? <Card><CardContent><p className="text-sm text-muted-foreground">Nenhum dispositivo registrado publica telemetria.</p></CardContent></Card> : null}
        {telemetry.data?.map(({ device }) => <TelemetryCard key={device.deviceId} deviceId={device.deviceId} showDeviceLink dashboard />)}
      </section>
      <h2 className="mb-4 text-lg font-semibold">Gateway</h2>
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
        </>
      ) : null}
    </>
  );
}
