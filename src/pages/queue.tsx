import { Activity, Inbox, RefreshCw } from "lucide-react";
import { type GatewayEvent } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGateway } from "@/context/gateway-context";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";

const outcomeLabel: Record<GatewayEvent["outcome"], string> = {
  accepted: "Aceita",
  rejected: "Rejeitada",
  route_published: "Rota publicada",
  route_failed: "Rota falhou",
};

function outcomeBadgeVariant(outcome: GatewayEvent["outcome"]) {
  return outcome === "rejected" || outcome === "route_failed" ? "destructive" : "success";
}

function RecentEventsCard() {
  const { recentEvents, refreshRecentEvents } = useGateway();
  const events = recentEvents.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Activity className="size-4" /> Atividade recente</span>
          <Button size="sm" variant="outline" onClick={() => void refreshRecentEvents()}><RefreshCw /> Atualizar</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Mensagens aceitas/rejeitadas e rotas locais disparando — diferente da outbox acima, que é só o que aguarda envio à VPS. Só os últimos 200 eventos, em memória; esquecido se o gateway reiniciar.
        </p>
        {recentEvents.loading && !events ? <Skeleton className="h-24" /> : null}
        {recentEvents.error && !events ? (
          <p className="text-sm text-destructive">Não foi possível carregar a atividade recente: {recentEvents.error}</p>
        ) : null}
        {events && events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade ainda nesta sessão do processo.</p>
        ) : null}
        {events?.length ? (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {events.map((event, index) => (
              <div key={index} className="rounded-md border border-border p-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={outcomeBadgeVariant(event.outcome)}>{outcomeLabel[event.outcome]}</Badge>
                    <span className="font-medium">{event.deviceId || "—"}</span>
                    {event.kind ? <span className="text-muted-foreground">· {event.kind}</span> : null}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</span>
                </div>
                {event.detail ? <p className="mt-1 break-all text-xs text-muted-foreground">{event.detail}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function Queue() {
  const { queueSummary, refreshQueueSummary } = useGateway();
  const data = queueSummary.data;

  return (
    <>
      <PageHeading
        title="Fila"
        description="Estado atual da outbox: dados aprovados para envio futuro à VPS, pendentes agora."
        action={<Button variant="outline" onClick={() => void refreshQueueSummary()}><RefreshCw /> Atualizar</Button>}
      />
      <div className="space-y-4">
        {queueSummary.loading && !data ? <Skeleton className="h-32" /> : null}
        {queueSummary.error && !data ? (
          <Card>
            <CardContent>
              <p className="text-destructive">Não foi possível carregar o resumo da fila.</p>
              <p className="mt-1 text-sm text-destructive/80">{queueSummary.error}</p>
            </CardContent>
          </Card>
        ) : null}
        {data ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Inbox className="size-4" /> Outbox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes agora</p>
                  <p className="mt-1 text-2xl font-semibold">{formatNumber(data.pendingMessages)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tamanho ocupado</p>
                  <p className="mt-1 text-2xl font-semibold">{formatBytes(data.pendingBytes)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Item mais antigo</p>
                  <p className="mt-1 text-2xl font-semibold">{data.oldestEnqueuedAt ? formatDate(data.oldestEnqueuedAt) : "—"}</p>
                </div>
              </div>
              {data.pendingMessages === "0" ? (
                <p className="text-sm text-muted-foreground">
                  Fila vazia. Isso é esperado: a outbox só recebe dados de devices com encaminhamento para a VPS habilitado, e nenhum fluxo de cadastro liga isso hoje.
                </p>
              ) : null}
              <p className="text-sm leading-6 text-muted-foreground">
                Este resumo é o estado atual da fila (diferente dos contadores acumulados desde o início do processo, que ficam na Visão geral). A API ainda não expõe itens individuais, payloads, motivo de descarte por mensagem ou histórico consultável — esta tela não inventa esses dados.
              </p>
            </CardContent>
          </Card>
        ) : null}
        <RecentEventsCard />
      </div>
    </>
  );
}
