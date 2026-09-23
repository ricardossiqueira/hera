import { type FormEvent, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { provisionCYD, provisionDevice, registerExistingDevice } from "@/api/gateway";
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

export function NewDevice() {
  const { refreshDevices } = useGateway();
  const [deviceId, setDeviceId] = useState("");
  const [deviceType, setDeviceType] = useState<"led" | "cyd" | "orangepi-monitor">("led");
  const [deviceIp, setDeviceIp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ mqttUsername: string; mqttPassword: string }>();
  const [cydResult, setCydResult] = useState<{ deviceId: string; deviceIp: string }>();
  const [existingResult, setExistingResult] = useState<string>();
  const [copied, setCopied] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const id = deviceId.trim();
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
      setError("Use letras minúsculas, números, hífen ou underscore; o ID deve começar com letra ou número.");
      return;
    }
    const ip = deviceIp.trim();
    if (deviceType === "cyd" && !isPrivateIPv4(ip)) {
      setError("Informe o IPv4 privado exibido pelo CYD no Serial Monitor.");
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      if (deviceType === "cyd") {
        const response = await provisionCYD(id, ip);
        setCydResult({ deviceId: response.device.id, deviceIp: response.deviceIp });
      } else if (deviceType === "orangepi-monitor") {
        const response = await registerExistingDevice(id);
        setExistingResult(response.device.id);
      } else {
        const response = await provisionDevice(id);
        setResult({ mqttUsername: response.mqttUsername, mqttPassword: response.mqttPassword });
      }
      void refreshDevices();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível cadastrar o dispositivo.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(
        "#define MQTT_USERNAME \"" + result.mqttUsername + "\"\n#define MQTT_PASSWORD \"" + result.mqttPassword + "\"",
      );
      setCopied(true);
    } catch {
      setError("Não foi possível copiar automaticamente. Copie o texto manualmente.");
    }
  };

  if (result) {
    return (
      <>
        <PageHeading
          title="Dispositivo provisionado"
          description="A credencial MQTT abaixo é exibida somente nesta tela. Copie-a agora; ela não será salva pelo gateway-web."
        />
        <Card className="max-w-2xl">
          <CardContent>
            <p className="font-medium text-success">O gateway foi reiniciado para aplicar o novo dispositivo.</p>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-background p-4 text-sm text-primary">
              {"#define MQTT_USERNAME \"" + result.mqttUsername + "\"\n#define MQTT_PASSWORD \"" + result.mqttPassword + "\""}
            </pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => void copyCredentials()}>
                {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar credentials"}
              </Button>
              <Button variant="outline" asChild><Link to="/devices">Voltar para dispositivos</Link></Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (cydResult) {
    return (
      <>
        <PageHeading
          title="CYD provisionado"
          description="As credenciais MQTT foram gravadas diretamente no NVS do CYD e não foram expostas no navegador."
        />
        <Card className="max-w-2xl">
          <CardContent>
            <p className="font-medium text-success">{cydResult.deviceId} recebeu a configuração em {cydResult.deviceIp}.</p>
            <p className="mt-2 text-sm text-muted-foreground">Aguarde a conexão MQTT; o endpoint temporário de provisionamento do CYD será fechado.</p>
            <div className="mt-4"><Button variant="outline" asChild><Link to="/devices">Voltar para dispositivos</Link></Button></div>
          </CardContent>
        </Card>
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
        description="Cadastre um ESP32 LED. O gateway criará a credencial MQTT, atualizará a configuração e reiniciará brevemente."
        action={<Button variant="outline" asChild><Link to="/devices"><ArrowLeft /> Voltar</Link></Button>}
      />
      <Card className="max-w-xl">
        <CardContent>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="device-type">Tipo</Label>
              <Select value={deviceType} onValueChange={(value) => setDeviceType(value as "led" | "cyd" | "orangepi-monitor")}>
                <SelectTrigger id="device-type" className="mb-4 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="led">ESP32 LED</SelectItem>
                  <SelectItem value="cyd">CYD Monitor</SelectItem>
                  <SelectItem value="orangepi-monitor">Orange Pi Monitor existente</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="device-id">ID do dispositivo</Label>
              <Input id="device-id" autoFocus value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder={deviceType === "cyd" ? "cyd-sala" : deviceType === "orangepi-monitor" ? "orangepi-monitor" : "esp32-led-3"} />
              <p className="text-xs text-muted-foreground">{deviceType === "orangepi-monitor" ? "Preserva a credencial DynSec existente e registra o tópico de telemetria." : deviceType === "cyd" ? "A credencial será entregue diretamente ao NVS do CYD." : "Template: ESP32 LED. Será criado somente o tópico de comando."}</p>
            </div>
            {deviceType === "cyd" ? (
              <div className="space-y-1.5">
                <Label htmlFor="device-ip">IP do CYD</Label>
                <Input id="device-ip" value={deviceIp} onChange={(event) => setDeviceIp(event.target.value)} placeholder="192.168.15.42" />
                <p className="text-xs text-muted-foreground">Copie o IP mostrado pelo firmware no Serial Monitor antes da primeira conexão MQTT.</p>
              </div>
            ) : null}
            {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Button type="submit" disabled={submitting}>{submitting ? "Provisionando…" : "Cadastrar e provisionar"}</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
