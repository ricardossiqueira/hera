import { useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { resolveInconsistency } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGateway } from "@/context/gateway-context";
import { formatDate } from "@/lib/format";

function InconsistenciesCard() {
  const { inconsistencies, refreshInconsistencies, reportError } = useGateway();
  const [resolvingId, setResolvingId] = useState<string>();
  const items = inconsistencies.data;

  // No card at all when there is nothing to review - an empty list is the
  // healthy state (docs/api-v1.md's "Inconsistências de provisionamento"),
  // same spirit as the Orange Pi card on Overview.
  if (!items?.length) return null;

  const resolve = async (id: string) => {
    setResolvingId(id);
    try {
      await resolveInconsistency(id);
      toast.success("Inconsistência marcada como resolvida.");
      void refreshInconsistencies();
    } catch (error) {
      reportError("Resolver inconsistência: " + (error instanceof Error ? error.message : "falha inesperada"));
    } finally {
      setResolvingId(undefined);
    }
  };

  return (
    <Card className="border-destructive/30 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive"><TriangleAlert className="size-4" /> Inconsistências de provisionamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Operações em que o gateway tentou desfazer um passo que falhou, e essa própria compensação também falhou. O registry e o Mosquitto podem estar divergindo — corrija manualmente e marque como resolvida.
        </p>
        {items.map((item) => (
          <div key={item.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.deviceId} · {item.kind}</p>
                <p className="mt-1 text-muted-foreground">{item.cause}</p>
                <p className="mt-1 text-destructive">{item.compensationError}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
              </div>
              <Button size="sm" variant="outline" disabled={resolvingId === item.id} onClick={() => void resolve(item.id)}>
                {resolvingId === item.id ? "Resolvendo…" : "Resolver"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function Diagnostics() {
  const { status, devices, refreshStatus, refreshDevices } = useGateway();
  return (
    <>
      <PageHeading
        title="Diagnóstico"
        description="Informações técnicas da sessão atual e erros de conectividade."
        action={
          <div className="flex gap-2">
            <Button onClick={() => void refreshStatus()}><RefreshCw /> Atualizar status</Button>
            <Button variant="outline" onClick={() => void refreshDevices()}>Atualizar devices</Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Status da API</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {status.error ?? (status.data ? "Última resposta em " + formatDate(status.updatedAt?.toISOString()) : "Aguardando primeira resposta.")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lista de dispositivos</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {devices.error ?? (devices.data ? devices.data.length + " dispositivo(s) na última resposta." : "Aguardando primeira resposta.")}
            </p>
          </CardContent>
        </Card>
        <InconsistenciesCard />
      </div>
    </>
  );
}
