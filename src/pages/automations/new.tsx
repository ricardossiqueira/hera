import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { type AutomationRuleV2, type OutputChannel, createAutomationRuleV2, listDevicesV2, outputLabel, type RegisteredDeviceV2 } from "@/api/device-v2";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

function commandsFor(device?: RegisteredDeviceV2) { return device?.manifest.mqtt.subscribe.flatMap((entry) => entry.commands) ?? []; }

export function NewAutomation() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<RegisteredDeviceV2[]>();
  const [id, setId] = useState("");
  const [sourceDeviceId, setSourceDeviceId] = useState("");
  const [outputChannel, setOutputChannel] = useState<OutputChannel | "">("");
  const [eventType, setEventType] = useState("");
  const [ignoreRetained, setIgnoreRetained] = useState(true);
  const [conditionJson, setConditionJson] = useState("");
  const [targetDeviceId, setTargetDeviceId] = useState("");
  const [commandType, setCommandType] = useState("");
  const [parametersJson, setParametersJson] = useState("{}");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { void listDevicesV2().then(setDevices).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao carregar interfaces.")); }, []);
  const source = devices?.find((device) => device.deviceId === sourceDeviceId);
  const target = devices?.find((device) => device.deviceId === targetDeviceId);
  const outputs = source?.manifest.mqtt.publish ?? [];
  const selectedOutput = outputs.find((output) => output.channel === outputChannel);
  const commands = commandsFor(target);
  const selectedCommand = commands.find((command) => command.type === commandType);
  const valid = useMemo(() => Boolean(id && source && selectedOutput && target && selectedCommand && (outputChannel !== "event" || eventType)), [eventType, id, outputChannel, selectedCommand, selectedOutput, source, target]);
  const submit = async () => {
    if (!valid) return;
    let parameters: Record<string, unknown>;
    try { parameters = JSON.parse(parametersJson) as Record<string, unknown>; } catch { setError("Os parâmetros devem ser um objeto JSON válido."); return; }
    if (conditionJson) { try { JSON.parse(conditionJson); } catch { setError("A condição deve ser JSONLogic válido."); return; } }
    const rule: AutomationRuleV2 = { id, enabled, trigger: { sourceDeviceId, outputChannel: outputChannel as OutputChannel, eventType: outputChannel === "event" ? eventType : undefined, ignoreRetained: outputChannel === "state" ? ignoreRetained : undefined, conditionJson: conditionJson || undefined }, action: { targetDeviceId, commandType, parameters }, updatedAt: new Date().toISOString() };
    setSubmitting(true); setError(undefined);
    try { await createAutomationRuleV2(rule); await navigate({ to: "/automations" }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar automação."); } finally { setSubmitting(false); }
  };
  const sourceChanged = (value: string) => { setSourceDeviceId(value); setOutputChannel(""); setEventType(""); };
  const targetChanged = (value: string) => { setTargetDeviceId(value); setCommandType(""); };
  return <>
    <PageHeading title="Nova automação" description="Construa a ligação usando somente interfaces declaradas pelos devices registrados." />
    <div className="space-y-4">{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <Card><CardHeader><CardTitle>1. Trigger — saída do device</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Device fonte</Label><Select value={sourceDeviceId} onValueChange={sourceChanged}><SelectTrigger><SelectValue placeholder="Selecione uma fonte" /></SelectTrigger><SelectContent>{devices?.filter((device) => device.manifest.mqtt.publish.length).map((device) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.deviceId}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Canal publicado</Label><Select value={outputChannel} onValueChange={(value) => { setOutputChannel(value as OutputChannel); setEventType(""); }} disabled={!source}><SelectTrigger><SelectValue placeholder="Selecione um canal" /></SelectTrigger><SelectContent>{outputs.map((output) => <SelectItem key={output.channel} value={output.channel}>{outputLabel(output.channel)}</SelectItem>)}</SelectContent></Select></div>{outputChannel === "event" ? <div className="space-y-2"><Label>Tipo de evento</Label><Select value={eventType} onValueChange={setEventType}><SelectTrigger><SelectValue placeholder="Selecione um evento" /></SelectTrigger><SelectContent>{selectedOutput?.events?.map((event) => <SelectItem key={event.type} value={event.type}>{event.type}</SelectItem>)}</SelectContent></Select></div> : null}{outputChannel === "state" ? <div className="flex items-center gap-2"><Switch checked={ignoreRetained} onCheckedChange={setIgnoreRetained} /><Label>Ignorar replay retained</Label></div> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>2. Condição opcional</CardTitle></CardHeader><CardContent><Label htmlFor="condition">JSONLogic limitado</Label><textarea id="condition" className="mt-2 min-h-24 w-full rounded-md border bg-transparent p-3 font-mono text-sm" value={conditionJson} onChange={(event) => setConditionJson(event.target.value)} placeholder='Ex.: {"<":[{"var":"cpu_pct"},90]}' /><p className="mt-2 text-xs text-muted-foreground">Vazio significa que qualquer mensagem válida dispara a ação.</p></CardContent></Card>
      <Card><CardHeader><CardTitle>3. Action — comando do destino</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Device alvo</Label><Select value={targetDeviceId} onValueChange={targetChanged}><SelectTrigger><SelectValue placeholder="Selecione um alvo" /></SelectTrigger><SelectContent>{devices?.filter((device) => commandsFor(device).length).map((device) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.deviceId}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Comando</Label><Select value={commandType} onValueChange={setCommandType} disabled={!target}><SelectTrigger><SelectValue placeholder="Selecione um comando" /></SelectTrigger><SelectContent>{commands.map((command) => <SelectItem key={command.type} value={command.type}>{command.type}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2 md:col-span-2"><Label htmlFor="parameters">Parâmetros fixos (JSON)</Label><textarea id="parameters" className="min-h-24 w-full rounded-md border bg-transparent p-3 font-mono text-sm" value={parametersJson} onChange={(event) => setParametersJson(event.target.value)} /><p className="mt-2 text-xs text-muted-foreground">Schema do comando: <code>{selectedCommand ? JSON.stringify(selectedCommand.parameters) : "selecione um comando"}</code></p></div></CardContent></Card>
      <Card><CardContent className="flex flex-wrap items-end gap-4"><div className="space-y-2"><Label htmlFor="rule-id">ID da regra</Label><Input id="rule-id" value={id} onChange={(event) => setId(event.target.value)} placeholder="orangepi-to-cyd" /></div><div className="flex items-center gap-2"><Switch checked={enabled} onCheckedChange={setEnabled} /><Label>Habilitada</Label></div><Button className="ml-auto" disabled={!valid || submitting} onClick={() => void submit()}>{submitting ? "Criando…" : "Criar automação"}</Button></CardContent></Card>
    </div>
  </>;
}
