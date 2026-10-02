import { Activity, Inbox, Radio, RefreshCw } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGateway } from "@/context/gateway-context";
import { formatDate, formatNumber } from "@/lib/format";

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
        </>
      ) : null}
    </>
  );
}
