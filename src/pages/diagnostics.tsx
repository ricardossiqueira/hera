import { RefreshCw } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGateway } from "@/context/gateway-context";
import { formatDate } from "@/lib/format";

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
      </div>
    </>
  );
}
