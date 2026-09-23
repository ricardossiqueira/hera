import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { type Device, publishSetLed } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGateway } from "@/context/gateway-context";

function isSelectableLed(device: Device) {
  return device.profile === "led.v1" && device.enabled && Boolean(device.topics?.command);
}

export function Devices() {
  const { devices, refreshDevices, reportError } = useGateway();
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const leds = (devices.data ?? []).filter(isSelectableLed);
  const toggleSelected = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const sendBatch = async (on: boolean) => {
    if (!selected.length) return;
    setSending(true);
    const results = await Promise.allSettled(selected.map((id) => publishSetLed(id, on)));
    setSending(false);
    const sent = results.filter((result) => result.status === "fulfilled").length;
    if (sent !== selected.length) reportError("Um ou mais comandos em lote falharam.");
    if (sent > 0) toast.success(sent + " comando(s) enviado(s) ao MQTT.");
  };

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
      {leds.length ? (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Controle em lote</p>
              <p className="text-sm text-muted-foreground">{selected.length} LED(s) selecionado(s)</p>
            </div>
            <div className="flex gap-2">
              <Button disabled={!selected.length || sending} onClick={() => void sendBatch(true)}>Ligar selecionados</Button>
              <Button disabled={!selected.length || sending} variant="outline" onClick={() => void sendBatch(false)}>Desligar selecionados</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
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
          {/* Desktop: table. Mobile: stacked cards below, same data and selection state. */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LED</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Habilitado</TableHead>
                  <TableHead>Tópicos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.data.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      {isSelectableLed(device) ? (
                        <Checkbox
                          aria-label={"Selecionar " + device.id}
                          checked={selected.includes(device.id)}
                          onCheckedChange={() => toggleSelected(device.id)}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Link to="/devices/$deviceId" params={{ deviceId: device.id }} className="font-medium text-primary hover:underline">
                        {device.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{device.type}</TableCell>
                    <TableCell className="text-muted-foreground">{device.profile || "—"}</TableCell>
                    <TableCell><Badge variant={device.enabled ? "success" : "outline"}>{device.enabled ? "Sim" : "Não"}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{Object.values(device.topics ?? {}).filter(Boolean).length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="grid gap-3 md:hidden">
            {devices.data.map((device) => (
              <Card key={device.id}>
                <CardContent className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {isSelectableLed(device) ? (
                      <Checkbox
                        className="mt-1"
                        aria-label={"Selecionar " + device.id}
                        checked={selected.includes(device.id)}
                        onCheckedChange={() => toggleSelected(device.id)}
                      />
                    ) : null}
                    <div>
                      <Link to="/devices/$deviceId" params={{ deviceId: device.id }} className="font-medium text-primary hover:underline">
                        {device.id}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">{device.type} · {device.profile || "sem profile"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{Object.values(device.topics ?? {}).filter(Boolean).length} tópico(s)</p>
                    </div>
                  </div>
                  <Badge variant={device.enabled ? "success" : "outline"}>{device.enabled ? "Habilitado" : "Desabilitado"}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
