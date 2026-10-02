import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Radar, RefreshCw } from "lucide-react";
import { type RegisteredDeviceV2, listDevicesV2 } from "@/api/device-v2";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const stateVariant = (state: RegisteredDeviceV2["activeState"]) => state === "active" ? "success" : state === "failed" ? "destructive" : "outline";

export function Devices() {
  const [devices, setDevices] = useState<RegisteredDeviceV2[]>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const refresh = async () => { setLoading(true); try { setDevices(await listDevicesV2()); setError(undefined); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar devices."); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); }, []);
  return <>
    <PageHeading title="Devices" description="Instâncias registradas e suas interfaces compiladas. O tipo de hardware não participa das regras da UI." action={<div className="flex gap-2"><Button variant="outline" disabled={loading} onClick={() => void refresh()}><RefreshCw /> Atualizar</Button><Button asChild><Link to="/devices/discovery"><Radar /> Discovery</Link></Button></div>} />
    {loading && !devices ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14" />)}</div> : null}
    {error ? <Card><CardContent><p className="text-destructive">{error}</p></CardContent></Card> : null}
    {devices?.length === 0 ? <Card><CardContent><p className="text-sm text-muted-foreground">Nenhum device ativo. Abra Discovery para registrar um device encontrado na LAN.</p></CardContent></Card> : null}
    {devices?.length ? <Card className="overflow-hidden p-0"><Table><TableHeader><TableRow><TableHead>Device</TableHead><TableHead>UID</TableHead><TableHead>Manifest / revisão</TableHead><TableHead>Interface</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{devices.map((device) => <TableRow key={device.deviceId}><TableCell><Link className="font-medium text-primary hover:underline" to="/devices/$deviceId" params={{ deviceId: device.deviceId }}>{device.deviceId}</Link><span className="block text-xs text-muted-foreground">{device.firmwareVersion}</span></TableCell><TableCell className="font-mono text-xs">{device.deviceUid}</TableCell><TableCell>{device.manifest.manifest_id}<span className="block font-mono text-xs text-muted-foreground">{device.manifestRevision}</span></TableCell><TableCell className="text-sm text-muted-foreground">{device.manifest.mqtt.publish.length} publica · {device.manifest.mqtt.subscribe.flatMap((item) => item.commands).length} comandos</TableCell><TableCell><Badge variant={stateVariant(device.activeState)}>{device.activeState}</Badge></TableCell></TableRow>)}</TableBody></Table></Card> : null}
  </>;
}
