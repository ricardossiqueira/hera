import { type FormEvent, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { provisionCYD, provisionLED, registerExistingDevice } from "@/api/gateway";
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
  return octets[0] === 10
    || (octets[0] === 192 && octets[1] === 168)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
}

type DeviceType = "led" | "cyd" | "orangepi-monitor";

export function NewDevice() {
  const { refreshDevices } = useGateway();
  const [deviceId, setDeviceId] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("led");
  const [deviceIp, setDeviceIp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [provisioned, setProvisioned] = useState<{ type: "LED" | "CYD"; deviceId: string; deviceIp: string }>();
  const [existingResult, setExistingResult] = useState<string>();

  const needsIP = deviceType === "led" || deviceType === "cyd";
  const deviceLabel = deviceType === "led" ? "LED" : "CYD";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const id = deviceId.trim();
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
      setError("Use letras minúsculas, números, hífen ou underscore; o ID deve começar com letra ou número.");
      return;
    }
    const ip = deviceIp.trim();
    if (needsIP && !isPrivateIPv4(ip)) {
      setError(`Informe o IPv4 privado exibido pelo ${deviceLabel} no Serial Monitor.`);
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      if (deviceType === "cyd") {
        const response = await provisionCYD(id, ip);
        setProvisioned({ type: "CYD", deviceId: response.device.id, deviceIp: response.deviceIp });
      } else if (deviceType === "led") {
        const response = await provisionLED(id, ip);
        setProvisioned({ type: "LED", deviceId: response.device.id, deviceIp: response.deviceIp });
      } else {
        const response = await registerExistingDevice(id);
        setExistingResult(response.device.id);
      }
      void refreshDevices();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível cadastrar o dispositivo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (provisioned) {
    return (
      <>
        <PageHeading
          title={`${provisioned.type} provisionado`}
          description="As credenciais MQTT foram gravadas diretamente no NVS e não foram expostas no navegador."
        />
        <Card className="max-w-2xl"><CardContent>
          <p className="font-medium text-success">{provisioned.deviceId} recebeu a configuração em {provisioned.deviceIp}.</p>
          <p className="mt-2 text-sm text-muted-foreground">Aguarde a conexão MQTT; o endpoint temporário de provisionamento será fechado.</p>
          <div className="mt-4"><Button variant="outline" asChild><Link to="/devices">Voltar para dispositivos</Link></Button></div>
        </CardContent></Card>
      </>
    );
  }

  if (existingResult) {
    return (
      <>
        <PageHeading title="Monitor registrado" description="A identidade MQTT existente foi preservada; apenas a política de telemetria foi adicionada ao SQLite." />
        <Card className="max-w-2xl"><CardContent>
          <p className="font-medium text-success">{existingResult} está disponível como origem de rotas locais.</p>
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma senha foi exibida, lida ou rotacionada.</p>
          <div className="mt-4"><Button variant="outline" asChild><Link to="/routes">Configurar rota</Link></Button></div>
        </CardContent></Card>
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Novo dispositivo"
        description="Cadastre pelo IP impresso no Serial Monitor. O gateway entrega a configuração MQTT diretamente ao NVS, sem reiniciar serviços."
        action={<Button variant="outline" asChild><Link to="/devices"><ArrowLeft /> Voltar</Link></Button>}
      />
      <Card className="max-w-xl"><CardContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="device-type">Tipo</Label>
            <Select value={deviceType} onValueChange={(value) => setDeviceType(value as DeviceType)}>
              <SelectTrigger id="device-type" className="mb-4 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="led">ESP32-C3 LED</SelectItem>
                <SelectItem value="cyd">CYD Monitor</SelectItem>
                <SelectItem value="orangepi-monitor">Orange Pi Monitor existente</SelectItem>
              </SelectContent>
            </Select>
            <Label htmlFor="device-id">ID do dispositivo</Label>
            <Input id="device-id" autoFocus value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder={deviceType === "cyd" ? "cyd-sala" : deviceType === "orangepi-monitor" ? "orangepi-monitor" : "led-sala"} />
            <p className="text-xs text-muted-foreground">
              {deviceType === "orangepi-monitor" ? "Preserva a credencial DynSec existente e registra o tópico de telemetria." : "A credencial será entregue diretamente ao NVS; nenhuma senha aparece aqui."}
            </p>
          </div>
          {needsIP ? (
            <div className="space-y-1.5">
              <Label htmlFor="device-ip">IP do {deviceLabel}</Label>
              <Input id="device-ip" value={deviceIp} onChange={(event) => setDeviceIp(event.target.value)} placeholder="192.168.15.42" />
              <p className="text-xs text-muted-foreground">Copie o IP mostrado pelo firmware no Serial Monitor antes da primeira conexão MQTT.</p>
            </div>
          ) : null}
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Button type="submit" disabled={submitting}>{submitting ? "Provisionando…" : "Cadastrar e provisionar"}</Button>
        </form>
      </CardContent></Card>
    </>
  );
}
