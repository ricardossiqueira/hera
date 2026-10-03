import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { type RegisteredDeviceV2 } from "@/api/device-v2";
import { useHera } from "@/context/hera-context";
import { LinkedTableRow } from "@/components/linked-table-row";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const stateVariant = (state: RegisteredDeviceV2["activeState"]) => state === "active" ? "success" : state === "failed" ? "destructive" : "outline";

export function Devices() {
  const { devices: resource, refreshDevices: refresh } = useHera();
  const { data: devices, error, loading } = resource;
  return <>
    <PageHeading title="Dispositivos" description="Dispositivos registrados e suas interfaces disponíveis." action={<Button variant="outline" disabled={loading} onClick={() => void refresh()}><RefreshCw /> Atualizar</Button>} />
    {loading && !devices ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14" />)}</div> : null}
    {error ? <Card><CardContent><p className="text-destructive">{error}</p></CardContent></Card> : null}
    {devices?.length === 0 ? <Card><CardContent><p className="text-sm text-muted-foreground">Nenhum dispositivo registrado. Abra Discovery no menu para encontrar dispositivos na rede.</p></CardContent></Card> : null}
    {devices?.length ? <Card className="overflow-hidden p-0"><Table><TableHeader><TableRow><TableHead>Dispositivo</TableHead><TableHead>UID</TableHead><TableHead>Manifest / revisão</TableHead><TableHead>Interface</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{devices.map((device) => <LinkedTableRow key={device.deviceId}><TableCell><Link data-row-link className="font-medium text-primary hover:underline" to="/devices/$deviceId" params={{ deviceId: device.deviceId }}>{device.deviceId}</Link><span className="block text-xs text-muted-foreground">{device.firmwareVersion}</span></TableCell><TableCell className="font-mono text-xs">{device.deviceUid}</TableCell><TableCell>{device.manifest.manifest_id}<span className="block font-mono text-xs text-muted-foreground">{device.manifestRevision}</span></TableCell><TableCell className="text-sm text-muted-foreground">{device.manifest.mqtt.publish.length} publica · {device.manifest.mqtt.subscribe.flatMap((item) => item.commands).length} comandos</TableCell><TableCell><Badge variant={stateVariant(device.activeState)}>{device.activeState}</Badge></TableCell></LinkedTableRow>)}</TableBody></Table></Card> : null}
  </>;
}
