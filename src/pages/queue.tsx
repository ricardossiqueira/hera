import { Inbox, RefreshCw } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGateway } from "@/context/gateway-context";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";

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
                Fila vazia. Isso é esperado: a outbox só recebe dados de devices com encaminhamento para a VPS habilitado, e ainda não existe transporte para lá.
              </p>
            ) : null}
            <p className="text-sm leading-6 text-muted-foreground">
              Este resumo é o estado atual da fila (diferente dos contadores acumulados desde o início do processo, que ficam na Visão geral). A API ainda não expõe itens individuais, payloads, motivo de descarte por mensagem ou histórico consultável — esta tela não inventa esses dados.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
