import { Link } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGateway } from "@/context/gateway-context";

export function Devices() {
  const { devices, manifestBindings, refreshDevices } = useGateway();
  const bindingsByDevice = new Map((manifestBindings.data ?? []).map((binding) => [binding.deviceId, binding]));

  return (
    <>
      <PageHeading
        title="Dispositivos"
        description="Configuração declarada no gateway. A tela não infere se um ESP32 está online."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refreshDevices()}><RefreshCw /> Atualizar agora</Button>
            <Button asChild><Link to="/devices/new"><Plus /> Novo dispositivo</Link></Button>
          </div>
        }
      />
      {devices.loading && !devices.data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12" />)}
        </div>
      ) : null}
      {devices.error && !devices.data ? (
        <Card>
          <CardContent>
            <p className="text-destructive">Não foi possível carregar dispositivos.</p>
            <p className="mt-1 text-sm text-destructive/80">{devices.error}</p>
          </CardContent>
        </Card>
      ) : null}
      {devices.data ? (
        <>
          {/* Desktop: table. Mobile: stacked cards below, same data. */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Manifest</TableHead>
                  <TableHead>Habilitado</TableHead>
                  <TableHead>Tópicos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.data.map((device) => {
                  const binding = bindingsByDevice.get(device.id);
                  return <TableRow key={device.id}>
                    <TableCell>
                      <Link to="/devices/$deviceId" params={{ deviceId: device.id }} className="font-medium text-primary hover:underline">
                        {device.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{device.type}</TableCell>
                    <TableCell className="text-muted-foreground">{binding ? `${binding.manifestId} · r${binding.manifestRevision}` : "Legado"}</TableCell>
                    <TableCell><Badge variant={device.enabled ? "success" : "outline"}>{device.enabled ? "Sim" : "Não"}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{Object.values(device.topics ?? {}).filter(Boolean).length}</TableCell>
                  </TableRow>;
                })}
              </TableBody>
            </Table>
          </Card>
          <div className="grid gap-3 md:hidden">
            {devices.data.map((device) => {
              const binding = bindingsByDevice.get(device.id);
              return <Card key={device.id}>
                <CardContent className="flex items-start justify-between gap-3">
                  <div>
                    <Link to="/devices/$deviceId" params={{ deviceId: device.id }} className="font-medium text-primary hover:underline">
                      {device.id}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{device.type}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{binding ? `Manifest: ${binding.manifestId} · r${binding.manifestRevision}` : "Manifest: legado"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{Object.values(device.topics ?? {}).filter(Boolean).length} tópico(s)</p>
                  </div>
                  <Badge variant={device.enabled ? "success" : "outline"}>{device.enabled ? "Habilitado" : "Desabilitado"}</Badge>
                </CardContent>
              </Card>;
            })}
          </div>
        </>
      ) : null}
    </>
  );
}
