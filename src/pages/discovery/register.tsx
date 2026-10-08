import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Check, ShieldCheck } from "lucide-react";
import { type DiscoveredDeviceV2, registerDiscoveredDeviceV2 } from "@/api/device-v2";
import { discoveryQuery, queryKeys } from "@/api/queries";
import { DeviceInterface } from "@/components/device-interface";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function suggestedId(entry: DiscoveredDeviceV2) { return `${entry.model}-${entry.deviceUid.slice(-4)}`.replace(/[^a-z0-9_.-]/g, "-"); }

export function RegisterDiscoveredDevice() {
  const { deviceUid } = useParams({ from: "/app/discovery/$deviceUid" });
  const { data: entries, error, isPending } = useQuery(discoveryQuery);
  const entry = entries?.find((item) => item.deviceUid === deviceUid);
  if (isPending) return <Card><CardContent>Carregando anúncio…</CardContent></Card>;
  if (!entry) return <Card><CardContent><p className="text-destructive">{error?.message ?? "O anúncio expirou."}</p><Link className="mt-3 inline-block text-primary hover:underline" to="/discovery">Voltar para discovery</Link></CardContent></Card>;
  // A different identity/interface must be reviewed again before registration.
  return <RegistrationForm key={`${deviceUid}:${entry.manifestSha256}:${entry.identityFingerprint}`} entry={entry} queryError={error?.message} />;
}

function RegistrationForm({ entry, queryError }: { entry: DiscoveredDeviceV2; queryError?: string }) {
  const deviceUid = entry.deviceUid;
  const navigate = useNavigate();
  const client = useQueryClient();
  const [deviceId, setDeviceId] = useState(() => suggestedId(entry));
  const [confirmManifest, setConfirmManifest] = useState(false);
  const { data: response, error: mutationError, isPending: submitting, mutate } = useMutation({
    mutationFn: () => registerDiscoveredDeviceV2(deviceUid, deviceId),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.device(result.device.deviceId), result.device);
      void client.invalidateQueries({ queryKey: queryKeys.deviceOverview });
      void client.invalidateQueries({ queryKey: queryKeys.status });
      void client.invalidateQueries({ queryKey: queryKeys.discovery });
    },
  });
  const error = mutationError?.message ?? queryError;
  const inspectionUnavailable = Boolean(queryError) || !entry.manifest || entry.trust === "invalid" || entry.status === "rejected" || entry.status === "offline";
  const canRegister = Boolean(entry?.deviceUid === deviceUid && !inspectionUnavailable && deviceId && /^[a-z0-9][a-z0-9_.-]*$/.test(deviceId) && confirmManifest);
  const register = () => { if (canRegister && !submitting && !response) mutate(); };
  return <>
    <PageHeading title={`Registrar ${entry.model}`} description={`UID imutável: ${entry.deviceUid}`} />
    <div className="space-y-4">
      {response ? <Alert><Check className="size-4" /><AlertDescription><strong>{response.device.deviceId}</strong> está ativo. O gateway derivou ACLs somente da interface abaixo; nenhuma senha MQTT foi exposta ao navegador.</AlertDescription></Alert> : null}
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {inspectionUnavailable ? <Alert variant="destructive"><AlertDescription>Registro indisponível. O dispositivo precisa de uma inspeção válida e estar acessível para continuar.</AlertDescription></Alert> : null}
      {entry.diagnostic ? <Card><CardHeader><CardTitle>Diagnóstico do gateway</CardTitle></CardHeader><CardContent><p className="break-words text-sm">{entry.diagnostic}</p></CardContent></Card> : null}
      <Card><CardHeader><CardTitle>Confirmação de identidade e manifest</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm md:grid-cols-2"><dl className="space-y-2"><div><dt className="text-muted-foreground">Endpoint</dt><dd>{entry.address}:{entry.port}</dd></div><div><dt className="text-muted-foreground">Firmware</dt><dd>{entry.firmwareVersion}</dd></div><div><dt className="text-muted-foreground">Fingerprint</dt><dd className="font-mono">{entry.identityFingerprint ?? "Não disponível"}</dd></div></dl><dl className="space-y-2"><div><dt className="text-muted-foreground">Manifest observado</dt><dd>{entry.manifest?.manifest_id ?? "Manifest indisponível"}</dd></div><div><dt className="text-muted-foreground">SHA-256</dt><dd className="break-all font-mono text-xs">{entry.manifestSha256}</dd></div><div><dt className="text-muted-foreground">Confiança</dt><dd><Badge variant={entry.trust === "trusted" ? "success" : entry.trust === "invalid" ? "destructive" : "outline"}>{entry.trust}</Badge></dd></div></dl></CardContent></Card>
      {!inspectionUnavailable && entry.trust === "unknown" ? <Alert><ShieldCheck className="size-4" /><AlertDescription>Este hash ainda não está aceito. Ao continuar, você aprova visualmente esta nova interface. O gateway deverá registrar essa decisão e o emissor antes de ativar o device.</AlertDescription></Alert> : null}
      {entry.manifest ? <DeviceInterface manifest={entry.manifest} /> : null}
      <Card><CardHeader><CardTitle>Registro</CardTitle></CardHeader><CardContent className="flex flex-wrap items-end gap-4"><div className="space-y-2"><Label htmlFor="device-id">Nome operacional (device_id)</Label><Input id="device-id" value={deviceId} onChange={(event) => setDeviceId(event.target.value)} /><p className="text-xs text-muted-foreground">minúsculas, números, ponto, hífen ou sublinhado.</p></div><label className="flex max-w-xl items-start gap-2 text-sm"><input className="mt-1" type="checkbox" disabled={inspectionUnavailable} checked={confirmManifest} onChange={(event) => setConfirmManifest(event.target.checked)} />Confirmo que revisei o UID, a identidade e a interface declarada acima.</label><Button disabled={!canRegister || submitting || Boolean(response)} onClick={() => void register()}>{submitting ? "Registrando…" : "Registrar device"}</Button>{response ? <Button variant="outline" onClick={() => void navigate({ to: "/devices/$deviceId", params: { deviceId: response.device.deviceId } })}>Ver device</Button> : null}</CardContent></Card>
      {response ? <Card><CardHeader><CardTitle>Progresso do provisionamento</CardTitle></CardHeader><CardContent><ol className="space-y-2">{response.steps.map((step) => <li key={step.id} className="flex gap-2 text-sm"><Check className="size-4 text-success" />{step.label}{step.detail ? ` — ${step.detail}` : ""}</li>)}</ol></CardContent></Card> : null}
    </div>
  </>;
}
