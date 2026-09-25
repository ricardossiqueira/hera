import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Lightbulb, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { migrateDeviceToManifest, type CommandDescriptor, publishCommand } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { coerceParameterValues, ParametersForm, parseParameterSchema } from "@/components/parameters-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDeviceCommands, useGateway } from "@/context/gateway-context";

function CommandForm({ deviceId, command, onError }: { deviceId: string; command: CommandDescriptor; onError: (message: string) => void }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [sending, setSending] = useState(false);
  const schema = parseParameterSchema(command.parametersJson);
  const submit = async () => {
    setSending(true);
    try { await publishCommand(deviceId, command.type, coerceParameterValues(schema, values)); toast.success("Comando enviado ao MQTT."); }
    catch (error) { onError(error instanceof Error ? error.message : "Falha ao enviar o comando."); }
    finally { setSending(false); }
  };
  return <div className="rounded-lg border p-3">
    <p className="font-medium">{command.type}</p>
    <ParametersForm idPrefix={command.type} schema={schema} values={values} onChange={setValues} />
    <Button className="mt-4" disabled={sending} onClick={() => void submit()}>{sending ? "Enviando…" : "Enviar comando"}</Button>
  </div>;
}

export function DeviceDetail() {
  const { deviceId } = useParams({ from: "/devices/$deviceId" });
  const { devices, manifestBindings, reportError } = useGateway();
  const device = devices.data?.find((item) => item.id === deviceId);
  const binding = manifestBindings.data?.find((item) => item.deviceId === deviceId);
  const commands = useDeviceCommands(device?.topics?.command ? device.id : undefined);
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
        {!binding ? <Card className="lg:col-span-2"><CardHeader><CardTitle>Vincular manifest</CardTitle></CardHeader><CardContent>
          <p className="text-sm text-muted-foreground">Informe o ID de um manifest publicado compatível. A migração não altera MQTT nem NVS.</p>
          <div className="mt-3 flex gap-2"><Input value={manifestId} onChange={(event) => setManifestId(event.target.value)} placeholder="esp32-c3-led" /><Button onClick={() => void migrate()}>Migrar</Button></div>
        </CardContent></Card> : null}
      </div>
    </>
  );
}
