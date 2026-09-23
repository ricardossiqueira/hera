import { type FormEvent, useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createRoute, listRoutes, removeRoute, type Route } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useGateway } from "@/context/gateway-context";

type Endpoint = { deviceId: string; topic: string; label: string };

function routeID(source: Endpoint | undefined, destination: Endpoint | undefined) {
  if (!source || !destination) return "";
  return source.deviceId + "-to-" + destination.deviceId;
}

export function Routes() {
  const { devices, reportError } = useGateway();
  const [routes, setRoutes] = useState<Route[]>();
  const [loading, setLoading] = useState(true);
  const [sourceTopic, setSourceTopic] = useState("");
  const [destinationTopic, setDestinationTopic] = useState("");
  const [id, setID] = useState("");
  const [commandType, setCommandType] = useState("render_system_status");
  const [qos, setQoS] = useState(1);
  const [retain, setRetain] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sources = useMemo<Endpoint[]>(() => (devices.data ?? []).flatMap((device) => {
    if (!device.enabled) return [];
    return (["telemetry", "state", "event", "commandResult"] as const)
      .flatMap((kind) => device.topics?.[kind] ? [{ deviceId: device.id, topic: device.topics[kind]!, label: device.id + " · " + kind }] : []);
  }), [devices.data]);
  const destinations = useMemo<Endpoint[]>(() => (devices.data ?? []).flatMap((device) => (
    device.enabled && device.topics?.command
      ? [{ deviceId: device.id, topic: device.topics.command, label: device.id + " · command" }]
      : []
  )), [devices.data]);

  const refresh = async () => {
    setLoading(true);
    try {
      setRoutes(await listRoutes());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível carregar as rotas.";
      reportError("Rotas: " + message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const chooseSource = (topic: string) => {
    setSourceTopic(topic);
    if (!id) setID(routeID(sources.find((item) => item.topic === topic), destinations.find((item) => item.topic === destinationTopic)));
  };
  const chooseDestination = (topic: string) => {
    setDestinationTopic(topic);
    if (!id) setID(routeID(sources.find((item) => item.topic === sourceTopic), destinations.find((item) => item.topic === topic)));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !sourceTopic || !destinationTopic || !commandType) return;
    setSubmitting(true);
    try {
      const response = await createRoute({ id, sourceTopic, destinationTopic, commandType, qos, retain });
      setRoutes((current) => [...(current ?? []), response.route].sort((a, b) => a.id.localeCompare(b.id)));
      toast.success("Rota persistida e aplicada pelo gateway, sem reinício.");
      setID("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar a rota.";
      reportError("Criar rota: " + message);
    } finally {
      setSubmitting(false);
    }
  };
  const remove = async (route: Route) => {
    setSubmitting(true);
    try {
      await removeRoute(route.id);
      setRoutes((current) => current?.filter((item) => item.id !== route.id));
      toast.success("Rota removida. O gateway atualizou a política sem reinício.");
    } catch (error) {
      reportError("Remover rota: " + (error instanceof Error ? error.message : "falha inesperada"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Rotas locais"
        description="Encaminhamentos MQTT persistidos no SQLite. Alterar uma rota não reinicia o gateway."
        action={<Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw /> Atualizar</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Nova rota</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void submit(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="route-source">Origem</Label>
                <Select value={sourceTopic} onValueChange={chooseSource}>
                  <SelectTrigger id="route-source" className="w-full"><SelectValue placeholder="Selecione um tópico de telemetria/estado" /></SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => <SelectItem key={source.topic} value={source.topic}>{source.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="route-destination">Destino</Label>
                <Select value={destinationTopic} onValueChange={chooseDestination}>
                  <SelectTrigger id="route-destination" className="w-full"><SelectValue placeholder="Selecione um tópico de comando" /></SelectTrigger>
                  <SelectContent>
                    {destinations.map((destination) => <SelectItem key={destination.topic} value={destination.topic}>{destination.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="route-id">ID da rota</Label><Input id="route-id" value={id} onChange={(event) => setID(event.target.value)} placeholder="orangepi-monitor-to-monitor" /></div>
              <div className="space-y-1.5"><Label htmlFor="route-command-type">Tipo de comando</Label><Input id="route-command-type" value={commandType} onChange={(event) => setCommandType(event.target.value)} /></div>
              <div className="flex items-center gap-3">
                <Label htmlFor="route-qos">QoS</Label>
                <Select value={String(qos)} onValueChange={(value) => setQoS(Number(value))}>
                  <SelectTrigger id="route-qos"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="0">0</SelectItem><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem></SelectContent>
                </Select>
                <Label htmlFor="route-retain" className="ml-2">Retain</Label><Switch id="route-retain" checked={retain} onCheckedChange={setRetain} />
              </div>
              <Button type="submit" disabled={submitting || !id || !sourceTopic || !destinationTopic || !commandType}>Criar rota</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rotas ativas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Carregando rotas…</p> : null}
            {!loading && !routes?.length ? <p className="text-sm text-muted-foreground">Nenhuma rota cadastrada.</p> : null}
            {routes?.map((route) => (
              <div key={route.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{route.id}</p><p className="mt-1 break-all text-muted-foreground">{route.sourceTopic} → {route.destinationTopic}</p><p className="mt-1 text-xs text-muted-foreground">{route.commandType} · QoS {route.qos}{route.retain ? " · retain" : ""}</p></div><Button size="sm" variant="ghost" aria-label={"Remover " + route.id} disabled={submitting} onClick={() => void remove(route)}><Trash2 /></Button></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
