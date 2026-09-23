import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Lightbulb, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { publishSetLed } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeviceCommands, useGateway } from "@/context/gateway-context";

export function DeviceDetail() {
  const { deviceId } = useParams({ from: "/devices/$deviceId" });
  const { devices, reportError } = useGateway();
  const device = devices.data?.find((item) => item.id === deviceId);
  const commands = useDeviceCommands(device?.profile === "led.v1" ? device.id : undefined);
  const [sending, setSending] = useState(false);

  if (devices.loading && !devices.data) return <Card><CardContent>Carregando dispositivo…</CardContent></Card>;
  if (!device) {
    return (
      <Card>
        <CardContent>
          <p className="text-destructive">Dispositivo não encontrado na configuração atual.</p>
          <Link to="/devices" className="mt-3 inline-block text-sm text-primary hover:underline">Voltar para dispositivos</Link>
        </CardContent>
      </Card>
    );
  }

  const send = async (on: boolean) => {
    setSending(true);
    try {
      await publishSetLed(device.id, on);
      toast.success("Comando enviado ao MQTT.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar o comando.";
      reportError("Comando " + device.id + ": " + message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeading
        title={device.id}
        description="Detalhes de configuração e comandos disponíveis."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/devices/$deviceId/settings" params={{ deviceId: device.id }}><Settings2 /> Configurações</Link>
            </Button>
            <Button variant="destructive" asChild>
              <Link to="/devices/$deviceId/remove" params={{ deviceId: device.id }}><Trash2 /> Remover</Link>
            </Button>
            <Button variant="outline" asChild><Link to="/devices"><ArrowLeft /> Voltar</Link></Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Configuração</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm">
              <div><dt className="text-muted-foreground">Tipo</dt><dd className="mt-0.5">{device.type}</dd></div>
              <div><dt className="text-muted-foreground">Profile</dt><dd className="mt-0.5">{device.profile || "Não definido"}</dd></div>
              <div><dt className="text-muted-foreground">Habilitado</dt><dd className="mt-0.5">{device.enabled ? "Sim" : "Não"}</dd></div>
              <div><dt className="text-muted-foreground">Tópico de comando</dt><dd className="mt-0.5 break-all">{device.topics?.command || "Não configurado"}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="size-4" /> Comandos</CardTitle></CardHeader>
          <CardContent>
            {commands.loading ? (
              <p className="text-sm text-muted-foreground">Verificando comandos declarados pelo gateway…</p>
            ) : commands.error ? (
              <p className="text-sm text-destructive">Não foi possível verificar os comandos: {commands.error}</p>
            ) : device.enabled && device.topics?.command && commands.data?.includes("set_led") ? (
              <div>
                <p className="text-sm leading-6 text-muted-foreground">O gateway confirma apenas a publicação no MQTT; este controle não confirma execução no ESP32.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button disabled={sending} onClick={() => void send(true)}>Ligar LED</Button>
                  <Button disabled={sending} variant="outline" onClick={() => void send(false)}>Desligar LED</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Este dispositivo não declarou um comando compatível nesta interface.</p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Administração</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">Alterações administrativas reiniciam brevemente o gateway. A remoção também revoga a credencial MQTT deste dispositivo.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link to="/devices/$deviceId/settings" params={{ deviceId: device.id }}>Ativar ou desativar</Link>
              </Button>
              <Button variant="destructive" asChild>
                <Link to="/devices/$deviceId/remove" params={{ deviceId: device.id }}><Trash2 /> Remover dispositivo</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
