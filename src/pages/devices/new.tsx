import { type FormEvent, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { listDeviceManifests, provisionDeviceByIP, registerExistingDevice, type DeviceManifest } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGateway } from "@/context/gateway-context";

function isPrivateIPv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet > 255)) return false;
  return octets[0] === 10 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
}

type ProvisionableManifest = Pick<DeviceManifest, "id" | "displayName"> & { model: string };

function provisionableManifest(manifest: DeviceManifest): ProvisionableManifest | undefined {
  try {
    const document = JSON.parse(manifest.documentJson) as { provisioning?: { protocol?: string; model?: string } };
    if (document.provisioning?.protocol !== "http-nvs-v1" || !document.provisioning.model) return undefined;
    return { id: manifest.id, displayName: manifest.displayName, model: document.provisioning.model };
  } catch {
    return undefined;
  }
}

export function NewDevice() {
  const { refreshDevices } = useGateway();
  const [deviceId, setDeviceId] = useState("");
  const [manifests, setManifests] = useState<ProvisionableManifest[]>([]);
  const [manifestId, setManifestId] = useState("");
  const [existingMonitor, setExistingMonitor] = useState(false);
  const [deviceIp, setDeviceIp] = useState("");
  const [loadingManifests, setLoadingManifests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [provisioned, setProvisioned] = useState<{ name: string; deviceId: string; deviceIp: string }>();
  const [existingResult, setExistingResult] = useState<string>();

  useEffect(() => {
    let active = true;
    void listDeviceManifests().then((items) => {
      if (!active) return;
      const available = items.flatMap((item) => {
        const parsed = provisionableManifest(item);
        return parsed ? [parsed] : [];
      });
      setManifests(available);
      setManifestId((current) => current || available[0]?.id || "");
    }).catch((requestError) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "NÃ£o foi possÃ­vel carregar os manifests.");
    }).finally(() => {
      if (active) setLoadingManifests(false);
    });
    return () => { active = false; };
  }, []);

  const selected = manifests.find((manifest) => manifest.id === manifestId);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const id = deviceId.trim();
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
      setError("Use letras minÃºsculas, nÃºmeros, hÃ­fen ou underscore; o ID deve comeÃ§ar com letra ou nÃºmero.");
      return;
    }
    const ip = deviceIp.trim();
    if (!existingMonitor && !isPrivateIPv4(ip)) {
      setError("Informe o IPv4 privado exibido pelo dispositivo no Serial Monitor.");
      return;
    }
    if (!existingMonitor && !selected) {
      setError("Selecione um manifest publicado compatÃ­vel com provisionamento por IP.");
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      if (existingMonitor) {
        const response = await registerExistingDevice(id);
        setExistingResult(response.device.id);
      } else {
        // The guard above guarantees a selection; retaining it in this
        // branch also makes the async boundary explicit to TypeScript.
        if (!selected) return;
        const response = await provisionDeviceByIP(id, selected.id, ip);
        setProvisioned({ name: selected.displayName, deviceId: response.device.id, deviceIp: response.deviceIp });
      }
      void refreshDevices();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "NÃ£o foi possÃ­vel cadastrar o dispositivo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (provisioned) return <>
    <PageHeading title={`${provisioned.name} provisionado`} description="As credenciais MQTT foram gravadas diretamente no NVS e nÃ£o foram expostas no navegador." />
    <Card className="max-w-2xl"><CardContent>
      <p className="font-medium text-success">{provisioned.deviceId} recebeu a configuraÃ§Ã£o em {provisioned.deviceIp}.</p>
      <p className="mt-2 text-sm text-muted-foreground">Aguarde a conexÃ£o MQTT; o endpoint temporÃ¡rio de provisionamento serÃ¡ fechado.</p>
      <div className="mt-4"><Button variant="outline" asChild><Link to="/devices">Voltar para dispositivos</Link></Button></div>
    </CardContent></Card>
  </>;

  if (existingResult) return <>
    <PageHeading title="Monitor registrado" description="A identidade MQTT existente foi preservada; apenas a polÃ­tica de telemetria foi adicionada ao SQLite." />
    <Card className="max-w-2xl"><CardContent>
      <p className="font-medium text-success">{existingResult} estÃ¡ disponÃ­vel como origem de rotas locais.</p>
      <p className="mt-2 text-sm text-muted-foreground">Nenhuma senha foi exibida, lida ou rotacionada.</p>
      <div className="mt-4"><Button variant="outline" asChild><Link to="/routes">Configurar rota</Link></Button></div>
    </CardContent></Card>
  </>;

  return <>
    <PageHeading title="Novo dispositivo" description="Selecione um manifest publicado e informe o IP exibido no Serial Monitor. O gateway valida o firmware e entrega MQTT ao NVS sem reiniciar serviÃ§os." action={<Button variant="outline" asChild><Link to="/devices"><ArrowLeft /> Voltar</Link></Button>} />
    <Card className="max-w-xl"><CardContent>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="device-kind">Cadastro</Label>
          <Select value={existingMonitor ? "existing-monitor" : manifestId} onValueChange={(value) => {
            setExistingMonitor(value === "existing-monitor");
            if (value !== "existing-monitor") setManifestId(value);
          }} disabled={loadingManifests}>
            <SelectTrigger id="device-kind" className="mb-4 w-full"><SelectValue placeholder={loadingManifests ? "Carregando manifestsâ€¦" : "Selecione um manifest"} /></SelectTrigger>
            <SelectContent>
              {manifests.map((manifest) => <SelectItem key={manifest.id} value={manifest.id}>{manifest.displayName}</SelectItem>)}
              <SelectItem value="existing-monitor">Orange Pi Monitor existente</SelectItem>
            </SelectContent>
          </Select>
          <Label htmlFor="device-id">ID do dispositivo</Label>
          <Input id="device-id" autoFocus value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder={existingMonitor ? "orangepi-monitor" : selected?.model === "cyd-monitor" ? "cyd-sala" : "led-sala"} />
          <p className="text-xs text-muted-foreground">{existingMonitor ? "Preserva a credencial DynSec existente e registra o tÃ³pico de telemetria." : "A credencial serÃ¡ entregue diretamente ao NVS; nenhuma senha aparece aqui."}</p>
        </div>
        {!existingMonitor ? <div className="space-y-1.5">
          <Label htmlFor="device-ip">IP do dispositivo</Label>
          <Input id="device-ip" value={deviceIp} onChange={(event) => setDeviceIp(event.target.value)} placeholder="192.168.15.42" />
          <p className="text-xs text-muted-foreground">Copie o IP mostrado pelo firmware no Serial Monitor antes da primeira conexÃ£o MQTT.</p>
        </div> : null}
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Button type="submit" disabled={submitting || loadingManifests || (!existingMonitor && !selected)}>{submitting ? "Provisionandoâ€¦" : existingMonitor ? "Registrar monitor" : "Cadastrar e provisionar"}</Button>
      </form>
    </CardContent></Card>
  </>;
}
