import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, AlertCircle, ArrowUpRight, Cpu, Inbox, MessageSquare, Radar, Radio, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeading } from "@/components/page-heading";
import { PageSection } from "@/components/page-section";
import { StatusIndicator } from "@/components/status-indicator";
import { TelemetryCard, isTheiaDevice } from "@/components/telemetry-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHera } from "@/context/hera-context";
import { formatDate, formatNumber } from "@/lib/format";

export function Overview() {
  const { status, refreshStatus, telemetry, refreshTelemetry } = useHera();
  const [refreshing, setRefreshing] = useState(false);
  const data = status.data;
  const otherTelemetry = telemetry.data?.filter(({ device }) => !isTheiaDevice(device)) ?? [];
  const devices = data?.devices;
  const discovery = data?.discovery;
  const count = (state: string) => devices ? devices.byActiveState?.[state] ?? 0 : undefined;
  const deviceStats = [
    { label: "Registrados", value: devices ? devices.total ?? 0 : undefined, icon: Cpu, note: "Dispositivos cadastrados" },
    { label: "Ativos no gateway", value: count("active"), icon: Activity, note: "Ativação concluída" },
    { label: "Precisam de atenção", value: devices ? (count("pending") ?? 0) + (count("failed") ?? 0) : undefined, icon: AlertCircle, note: "Pendentes ou com falha" },
  ];
  const discoveryStats = [
    { label: "Descobertos", value: discovery ? discovery.total ?? 0 : undefined, icon: Radar, note: "Dispositivos encontrados na rede" },
    { label: "Online no Discovery", value: discovery ? discovery.online ?? 0 : undefined, icon: Wifi, note: "Anunciados na rede" },
    { label: "Offline no Discovery", value: discovery ? discovery.offline ?? 0 : undefined, icon: WifiOff, note: "Marcados como offline" },
  ];
  const runtimeDetails = data ? [
    ["Iniciado em", formatDate(data.startedAt)],
    ["Rotas locais publicadas", formatNumber(data.localRoutesPublished)],
    ["Falhas em rotas locais", formatNumber(data.localRoutesFailed)],
    ["Falhas na outbox", formatNumber(data.outboxFailed)],
    ["Gateway iniciado", data.started ? "Sim" : "Não"],
  ] : [];
  async function refresh() {
    setRefreshing(true);
    try { await Promise.all([refreshStatus(), refreshTelemetry()]); }
    finally { setRefreshing(false); }
  }

  return <>
    <PageHeading title="Visão geral" description="Cada sinal, no seu contexto. Acompanhe seus dispositivos e a saúde da sua operação."
      action={<Button variant="outline" onClick={() => void refresh()} disabled={refreshing} aria-busy={refreshing}>
        <RefreshCw className={refreshing ? "motion-safe:animate-spin" : ""} /> Atualizar agora
      </Button>} />
    <div className="mb-9 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4 text-sm text-muted-foreground">
      <StatusIndicator state={status.error ? "offline" : data ? "online" : "pending"}>
        {status.error ? "Conexão indisponível" : data ? "Conectado ao gateway" : "Verificando conexão"}
      </StatusIndicator>
      <span>Atualização automática · 10 segundos</span>
      {status.updatedAt ? <span>Última consulta: <time dateTime={status.updatedAt.toISOString()}>{status.updatedAt.toLocaleTimeString("pt-BR")}</time></span> : null}
    </div>
    <div className="space-y-10">
      <PageSection title="Dispositivos" description="Do cadastro à ativação, tudo em um só lugar."
        action={<Button variant="ghost" asChild><Link to="/devices">Ver dispositivos <ArrowUpRight /></Link></Button>}>
        {status.error ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6 text-destructive">Não foi possível atualizar o resumo de dispositivos: {status.error}{data ? " Exibindo a última consulta." : ""}</p> : null}
        {data && (!devices || !discovery) ? <p className="text-sm text-muted-foreground">O gateway ainda não disponibilizou o resumo de dispositivos.</p> : null}
        <div className="grid gap-4 sm:grid-cols-3">
          {deviceStats.map((metric) => <MetricCard key={metric.label} {...metric} loading={status.loading && !data} value={metric.value === undefined ? "—" : formatNumber(metric.value)} />)}
        </div>
      </PageSection>

      {otherTelemetry.length > 0 ? <PageSection title="Telemetria dos dispositivos" description="Sinais dos demais dispositivos do seu workspace.">
        {otherTelemetry.map(({ device }) => <TelemetryCard key={device.deviceId} deviceId={device.deviceId} showDeviceLink dashboard />)}
      </PageSection> : null}
      <PageSection title="Discovery" description="Presença e descoberta na sua rede local."
        action={<Button variant="ghost" asChild><Link to="/discovery">Ver Discovery <ArrowUpRight /></Link></Button>}>
        <div className="grid gap-4 sm:grid-cols-3">
          {discoveryStats.map((metric) => <MetricCard key={metric.label} {...metric} loading={status.loading && !data} value={metric.value === undefined ? "—" : formatNumber(metric.value)} />)}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">Online/offline refletem o Discovery, incluindo dispositivos ainda não registrados; não confirmam conexão MQTT.</p>
      </PageSection>

      <PageSection title="Gateway" description="Conectividade e processamento de mensagens."
        action={<Button variant="ghost" asChild><Link to="/queue">Ver fila <ArrowUpRight /></Link></Button>}>
        {status.loading && !data ? <div className="grid gap-4 sm:grid-cols-2 @min-[900px]:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-40" />)}</div> : null}
        {status.error && !data ? <Card><CardContent><p className="text-base text-destructive">Não foi possível carregar o status.</p><p className="mt-2 text-sm text-muted-foreground">Uma nova tentativa será feita automaticamente.</p></CardContent></Card> : null}
        {data ? <>
          {status.error ? <p className="text-sm text-muted-foreground">MQTT e contadores abaixo refletem a última consulta bem-sucedida.</p> : null}
          <div className="grid gap-4 sm:grid-cols-2 @min-[900px]:grid-cols-4">
            <MetricCard icon={Activity} label="API" value={status.error ? "Indisponível" : "Online"}
              note={<StatusIndicator state={status.error ? "offline" : "online"}>{status.error ? "Falha na última consulta" : "Respondendo às consultas"}</StatusIndicator>} />
            <MetricCard icon={Radio} label="MQTT" value={data.mqttConnected ? "Conectado" : "Desconectado"}
              note={<StatusIndicator state={data.mqttConnected ? "online" : "offline"}>{data.subscriptions ?? 0} inscrições ativas</StatusIndicator>} />
            <MetricCard icon={MessageSquare} label="Mensagens aceitas" value={formatNumber(data.acceptedMessages)} note={<>Rejeitadas: {formatNumber(data.rejectedMessages)}</>} />
            <MetricCard icon={Inbox} label="Outbox armazenada" value={formatNumber(data.outboxStored)} note={<>Descartadas: {formatNumber(data.outboxDiscarded)}</>} />
          </div>
          <Card>
            <CardHeader><CardTitle>Detalhes do runtime</CardTitle></CardHeader>
            <CardContent><dl className="grid gap-x-8 gap-y-6 text-sm sm:grid-cols-2 xl:grid-cols-3">
              {runtimeDetails.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-2 break-words">{value}</dd></div>)}
            </dl></CardContent>
          </Card>
        </> : null}
      </PageSection>
    </div>
  </>;
}
