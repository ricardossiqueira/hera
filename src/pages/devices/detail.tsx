import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, FileJson } from "lucide-react";
import { toast } from "sonner";
import { type CommandDefinitionV2, type DeviceManifestV2, type RegisteredDeviceV2, getDeviceV2, publishCommandV2 } from "@/api/device-v2";
import { DeviceInterface } from "@/components/device-interface";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/**
 * Minimal manual test control: a toggle for any declared command whose
 * parameters are exactly one boolean field (covers set_led without
 * hardcoding it) - not a general command form. A real command console
 * belongs in DeviceInterface instead, once there's more than one shape to
 * support.
 */
function CommandToggle({ deviceId, command }: { deviceId: string; command: CommandDefinitionV2 }) {
  const [paramName] = Object.keys(command.parameters);
  const [checked, setChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const toggle = async (next: boolean) => {
    setSending(true);
    setChecked(next);
    try {
      await publishCommandV2(deviceId, command.type, { [paramName]: next });
      toast.success(`Comando "${command.type}" enviado.`);
    } catch (error) {
      setChecked(!next);
      toast.error(error instanceof Error ? error.message : "Falha ao enviar comando.");
    } finally {
      setSending(false);
    }
  };
  return <div className="flex items-center justify-between rounded-lg border p-3">
    <div><code className="font-medium">{command.type}</code><p className="text-xs text-muted-foreground">Alterna <code>{paramName}</code></p></div>
    <Switch checked={checked} disabled={sending} onCheckedChange={(value) => void toggle(value)} />
  </div>;
}

function CommandControls({ deviceId, manifest }: { deviceId: string; manifest: DeviceManifestV2 }) {
  const commands = manifest.mqtt.subscribe.flatMap((entry) => entry.commands)
    .filter((command) => {
      const fields = Object.entries(command.parameters);
      return fields.length === 1 && fields[0][1].type === "boolean";
    });
  if (!commands.length) return null;
  return <Card>
    <CardHeader><CardTitle>Controle rápido</CardTitle></CardHeader>
    <CardContent className="space-y-2">{commands.map((command) => <CommandToggle key={command.type} deviceId={deviceId} command={command} />)}</CardContent>
  </Card>;
}

export function DeviceDetail() {
  const { deviceId } = useParams({ from: "/devices/$deviceId" });
  const [device, setDevice] = useState<RegisteredDeviceV2>();
  const [error, setError] = useState<string>();
  useEffect(() => { void getDeviceV2(deviceId).then(setDevice).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao carregar device.")); }, [deviceId]);
  if (!device && !error) return <Card><CardContent>Carregando device…</CardContent></Card>;
  if (!device) return <Card><CardContent><p className="text-destructive">{error}</p><Link to="/devices" className="mt-3 inline-block text-primary hover:underline">Voltar para devices</Link></CardContent></Card>;
  return <>
    <PageHeading title={device.deviceId} description="Interface observada no device e aceita pelo gateway." action={<Button variant="outline" asChild><Link to="/devices"><ArrowLeft /> Voltar</Link></Button>} />
    <div className="space-y-4"><Card><CardHeader><CardTitle>Binding ativo</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm md:grid-cols-3"><dl><dt className="text-muted-foreground">UID imutável</dt><dd className="mt-1 font-mono">{device.deviceUid}</dd></dl><dl><dt className="text-muted-foreground">Manifest</dt><dd className="mt-1">{device.manifest.manifest_id} <span className="font-mono text-xs">({device.manifestRevision})</span></dd></dl><dl><dt className="text-muted-foreground">Estado</dt><dd className="mt-1"><Badge variant={device.activeState === "active" ? "success" : "outline"}>{device.activeState}</Badge></dd></dl><dl><dt className="text-muted-foreground">Hash aceito</dt><dd className="mt-1 break-all font-mono text-xs">{device.manifestHash}</dd></dl><dl><dt className="text-muted-foreground">Identidade</dt><dd className="mt-1 font-mono text-xs">{device.identityFingerprint}</dd></dl><dl><dt className="text-muted-foreground">Atualizado</dt><dd className="mt-1">{new Date(device.updatedAt).toLocaleString()}</dd></dl></CardContent></Card>
      {device.recoveryReason ? <Card><CardContent><p className="text-destructive">Recuperação necessária: {device.recoveryReason}</p></CardContent></Card> : null}
      <CommandControls deviceId={device.deviceId} manifest={device.manifest} />
      <DeviceInterface manifest={device.manifest} />
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileJson className="size-4" /> Manifest observado</CardTitle></CardHeader><CardContent><pre className="max-h-96 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(device.manifest, null, 2)}</pre></CardContent></Card>
    </div>
  </>;
}
