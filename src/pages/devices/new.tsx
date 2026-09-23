import { type FormEvent, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { provisionDevice } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGateway } from "@/context/gateway-context";

export function NewDevice() {
  const { refreshDevices } = useGateway();
  const [deviceId, setDeviceId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ mqttUsername: string; mqttPassword: string }>();
  const [copied, setCopied] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const id = deviceId.trim();
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
      setError("Use letras minúsculas, números, hífen ou underscore; o ID deve começar com letra ou número.");
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const response = await provisionDevice(id);
      setResult({ mqttUsername: response.mqttUsername, mqttPassword: response.mqttPassword });
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
              <Label htmlFor="device-id">ID do dispositivo</Label>
              <Input id="device-id" autoFocus value={deviceId} onChange={(event) => setDeviceId(event.target.value)} placeholder="esp32-led-3" />
              <p className="text-xs text-muted-foreground">Template: ESP32 LED. Será criado somente o tópico de comando.</p>
            </div>
            {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
            <Button type="submit" disabled={submitting}>{submitting ? "Provisionando…" : "Cadastrar e provisionar"}</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
