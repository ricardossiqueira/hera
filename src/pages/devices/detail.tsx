import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Lightbulb, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { migrateDeviceToManifest, type CommandDescriptor, publishCommand, publishSetLed } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeviceCommands, useGateway } from "@/context/gateway-context";

type ParameterSchema = Record<string, { type?: string; required?: boolean }>;

function CommandForm({ deviceId, command, onError }: { deviceId: string; command: CommandDescriptor; onError: (message: string) => void }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [sending, setSending] = useState(false);
  let schema: ParameterSchema = {};
  try { schema = command.parametersJson ? JSON.parse(command.parametersJson) as ParameterSchema : {}; } catch { schema = {}; }
  const submit = async () => {
    const parameters: Record<string, unknown> = {};
    for (const [name, field] of Object.entries(schema)) {
      const value = values[name];
      if (field.type === "boolean") parameters[name] = value === true;
      else if (value !== undefined && value !== "") parameters[name] = field.type === "number" || field.type === "integer" ? Number(value) : value;
    }
    setSending(true);
    try { await publishCommand(deviceId, command.type, parameters); toast.success("Comando enviado ao MQTT."); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao enviar o comando."); }
    finally { setSending(false); }
  };
  return <div className="rounded-lg border p-3">
    <p className="font-medium">{command.type}</p>
    {Object.entries(schema).map(([name, field]) => <div key={name} className="mt-3 space-y-1.5">
      <Label htmlFor={`${command.type}-${name}`}>{name}{field.required ? " *" : ""}</Label>
      {field.type === "boolean" ? <input id={`${command.type}-${name}`} type="checkbox" checked={values[name] === true} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.checked }))} /> :
        <Input id={`${command.type}-${name}`} type={field.type === "number" || field.type === "integer" ? "number" : "text"} value={typeof values[name] === "string" ? values[name] : ""} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} />}
    </div>)}
    <Button className="mt-4" disabled={sending} onClick={() => void submit()}>{sending ? "Enviando…" : "Enviar comando"}</Button>
  </div>;
}

export function DeviceDetail() {
  const { deviceId } = useParams({ from: "/devices/$deviceId" });
  const { devices, manifestBindings, reportError } = useGateway();
  const device = devices.data?.find((item) => item.id === deviceId);
  const binding = manifestBindings.data?.find((item) => item.deviceId === deviceId);
  const commands = useDeviceCommands(device?.topics?.command ? device.id : undefined);
  const [sending, setSending] = useState(false);
  const [manifestId, setManifestId] = useState("");

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

  const migrate = async () => {
    if (!manifestId) return;
    try { await migrateDeviceToManifest(device.id, manifestId); toast.success("Dispositivo migrado para o manifest."); window.location.reload(); }
    catch (error) { reportError(error instanceof Error ? error.message : "Falha ao migrar dispositivo."); }
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
              <div><dt className="text-muted-foreground">Manifest provisionado</dt><dd className="mt-0.5">{binding ? `${binding.manifestId} · revisão ${binding.manifestRevision}` : manifestBindings.loading ? "Carregando…" : "Legado / sem manifest"}</dd></div>
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
            ) : device.enabled && device.topics?.command && commands.data?.some((command) => command.parametersJson) ? (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">Campos gerados a partir do manifest vinculado ao dispositivo.</p>
                {commands.data.filter((command) => command.parametersJson).map((command) => <CommandForm key={command.type} deviceId={device.id} command={command} onError={(message) => reportError("Comando " + device.id + ": " + message)} />)}
              </div>
            ) : device.enabled && device.topics?.command && commands.data?.some((command) => command.type === "set_led") ? (
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
        {!binding && device.profile ? <Card className="lg:col-span-2"><CardHeader><CardTitle>Migrar profile legado</CardTitle></CardHeader><CardContent>
          <p className="text-sm text-muted-foreground">Informe o ID de um manifest publicado compatível. A migração não altera MQTT nem NVS.</p>
          <div className="mt-3 flex gap-2"><Input value={manifestId} onChange={(event) => setManifestId(event.target.value)} placeholder="esp32-c3-led" /><Button onClick={() => void migrate()}>Migrar</Button></div>
        </CardContent></Card> : null}
      </div>
    </>
  );
}
