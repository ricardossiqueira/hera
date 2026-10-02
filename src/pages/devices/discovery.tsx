import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Search } from "lucide-react";
import { type DiscoveredDeviceV2, listDiscoveryV2 } from "@/api/device-v2";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusVariant = (status: DiscoveredDeviceV2["status"]) => status === "ready_to_register" ? "success" : status === "rejected" ? "destructive" : "outline";
const trustVariant = (trust: DiscoveredDeviceV2["trust"]) => trust === "trusted" ? "success" : trust === "invalid" ? "destructive" : "outline";

export function Discovery() {
  const [entries, setEntries] = useState<DiscoveredDeviceV2[]>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const refresh = async () => { setLoading(true); try { setEntries(await listDiscoveryV2()); setError(undefined); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao consultar discovery."); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 10_000); return () => window.clearInterval(timer); }, []);

  return <>
    <PageHeading title="Discovery" description="Anúncios mDNS vistos na LAN. Descoberta não concede confiança nem credenciais MQTT." action={<Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw /> Atualizar</Button>} />
    {loading && !entries ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14" />)}</div> : null}
    {error ? <Card><CardContent><p className="text-destructive">{error}</p></CardContent></Card> : null}
    {entries?.length === 0 ? <Card><CardContent><p className="text-sm text-muted-foreground">Nenhum device anunciado nos últimos 90 segundos.</p></CardContent></Card> : null}
    {entries?.length ? <Card className="overflow-hidden p-0"><Table><TableHeader><TableRow><TableHead>UID</TableHead><TableHead>Endpoint</TableHead><TableHead>Modelo / firmware</TableHead><TableHead>Manifest</TableHead><TableHead>Confiança</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader><TableBody>{entries.map((entry) => <TableRow key={entry.deviceUid}><TableCell className="font-mono text-xs">{entry.deviceUid}</TableCell><TableCell>{entry.address}:{entry.port}</TableCell><TableCell>{entry.model}<span className="block text-xs text-muted-foreground">{entry.firmwareVersion}</span></TableCell><TableCell className="font-mono text-xs">{entry.manifestSha256.slice(0, 12)}…</TableCell><TableCell><Badge variant={trustVariant(entry.trust)}>{entry.trust}</Badge></TableCell><TableCell><Badge variant={statusVariant(entry.status)}>{entry.status.replaceAll("_", " ")}</Badge></TableCell><TableCell><Button size="sm" variant="outline" asChild><Link to="/devices/discovery/$deviceUid" params={{ deviceUid: entry.deviceUid }}><Search /> Inspecionar</Link></Button></TableCell></TableRow>)}</TableBody></Table></Card> : null}
  </>;
}
