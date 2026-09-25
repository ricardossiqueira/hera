import { type FormEvent, useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { type AutomationRule, createAutomationRule, listAutomationRules, removeAutomationRule, setAutomationRuleEnabled } from "@/api/gateway";
import { ConditionBuilder } from "@/components/condition-builder";
import { coerceParameterValues, ParametersForm, parseParameterSchema } from "@/components/parameters-form";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDeviceCommands, useDeviceEvents, useGateway } from "@/context/gateway-context";

function ruleID(sourceDeviceId: string, eventType: string, actionDeviceId: string) {
  if (!sourceDeviceId || !eventType || !actionDeviceId) return "";
  return sourceDeviceId + "-" + eventType + "-to-" + actionDeviceId;
}

function payloadFields(payloadJson?: string): string[] {
  try {
    const schema = payloadJson ? JSON.parse(payloadJson) as Record<string, unknown> : {};
    return Object.keys(schema);
  } catch {
    return [];
  }
}

export function Automations() {
  const { devices, reportError } = useGateway();
  const [rules, setRules] = useState<AutomationRule[]>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [id, setID] = useState("");
  const [sourceDeviceId, setSourceDeviceId] = useState("");
  const [eventType, setEventType] = useState("");
  const [conditionJson, setConditionJson] = useState("");
  const [actionDeviceId, setActionDeviceId] = useState("");
  const [actionCommandType, setActionCommandType] = useState("");
  const [actionValues, setActionValues] = useState<Record<string, string | boolean>>({});
  const [enabled, setEnabled] = useState(true);

  const sourceDevices = useMemo(() => (devices.data ?? []).filter((device) => device.enabled && device.topics?.event), [devices.data]);
  const actionDevices = useMemo(() => (devices.data ?? []).filter((device) => device.enabled && device.topics?.command), [devices.data]);

  const events = useDeviceEvents(sourceDeviceId || undefined);
  const commands = useDeviceCommands(actionDeviceId || undefined);
  const selectedEvent = events.data?.find((event) => event.type === eventType);
  const selectedCommand = commands.data?.find((command) => command.type === actionCommandType);
  const actionSchema = parseParameterSchema(selectedCommand?.parametersJson);

  // A device change invalidates whatever event/command type was picked for
  // the previous one - same reasoning routes.tsx doesn't need (topics
  // there are self-contained strings, not a device+type pair).
  useEffect(() => { setEventType(""); }, [sourceDeviceId]);
  useEffect(() => { setActionCommandType(""); setActionValues({}); }, [actionDeviceId]);

  const refresh = async () => {
    setLoading(true);
    try {
      setRules(await listAutomationRules());
    } catch (error) {
      reportError("Automações: " + (error instanceof Error ? error.message : "não foi possível carregar as regras."));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const chooseSource = (deviceId: string) => {
    setSourceDeviceId(deviceId);
    if (!id) setID(ruleID(deviceId, eventType, actionDeviceId));
  };
  const chooseEventType = (type: string) => {
    setEventType(type);
    if (!id) setID(ruleID(sourceDeviceId, type, actionDeviceId));
  };
  const chooseAction = (deviceId: string) => {
    setActionDeviceId(deviceId);
    if (!id) setID(ruleID(sourceDeviceId, eventType, deviceId));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !sourceDeviceId || !eventType || !actionDeviceId || !actionCommandType) return;
    setSubmitting(true);
    try {
      const response = await createAutomationRule({
        id, enabled, sourceDeviceId, eventType, conditionJson,
        actionDeviceId, actionCommandType, actionParametersJson: JSON.stringify(coerceParameterValues(actionSchema, actionValues)),
      });
      setRules((current) => [...(current ?? []), response.rule].sort((a, b) => a.id.localeCompare(b.id)));
      toast.success("Regra de automação criada.");
      setID(""); setSourceDeviceId(""); setEventType(""); setConditionJson("");
      setActionDeviceId(""); setActionCommandType(""); setActionValues({}); setEnabled(true);
    } catch (error) {
      reportError("Criar regra: " + (error instanceof Error ? error.message : "falha inesperada"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = async (rule: AutomationRule) => {
    setSubmitting(true);
    try {
      const response = await setAutomationRuleEnabled(rule.id, !rule.enabled);
      setRules((current) => current?.map((item) => item.id === rule.id ? response.rule : item));
    } catch (error) {
      reportError("Atualizar regra: " + (error instanceof Error ? error.message : "falha inesperada"));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (rule: AutomationRule) => {
    setSubmitting(true);
    try {
      await removeAutomationRule(rule.id);
      setRules((current) => current?.filter((item) => item.id !== rule.id));
      toast.success("Regra removida.");
    } catch (error) {
      reportError("Remover regra: " + (error instanceof Error ? error.message : "falha inesperada"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeading
        title="Automações"
        description="Regras evento → condição → ação, executadas pelo gateway assim que o evento é aceito. Sem edição: para mudar uma regra, remova e recrie."
        action={<Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw /> Atualizar</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Nova regra</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void submit(event)}>
              <div className="space-y-1.5">
                <Label htmlFor="rule-source">Dispositivo de origem</Label>
                <Select value={sourceDeviceId} onValueChange={chooseSource}>
                  <SelectTrigger id="rule-source" className="w-full"><SelectValue placeholder="Selecione um dispositivo com tópico de evento" /></SelectTrigger>
                  <SelectContent>{sourceDevices.map((device) => <SelectItem key={device.id} value={device.id}>{device.id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-event-type">Tipo de evento</Label>
                <Input
                  id="rule-event-type" list="rule-event-type-options" value={eventType}
                  onChange={(inputEvent) => chooseEventType(inputEvent.target.value)}
                  placeholder="button_pressed" disabled={!sourceDeviceId}
                />
                {events.data?.length ? <datalist id="rule-event-type-options">{events.data.map((event) => <option key={event.type} value={event.type} />)}</datalist> : null}
                {sourceDeviceId && !events.loading && !events.data?.length ? <p className="text-xs text-muted-foreground">Este dispositivo não tem manifest com eventos declarados — informe o tipo manualmente.</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label>Condição</Label>
                <ConditionBuilder value={conditionJson} onChange={setConditionJson} fieldSuggestions={payloadFields(selectedEvent?.payloadJson)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rule-action-device">Dispositivo de ação</Label>
                <Select value={actionDeviceId} onValueChange={chooseAction}>
                  <SelectTrigger id="rule-action-device" className="w-full"><SelectValue placeholder="Selecione um dispositivo com tópico de comando" /></SelectTrigger>
                  <SelectContent>{actionDevices.map((device) => <SelectItem key={device.id} value={device.id}>{device.id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {actionDeviceId ? (
                <div className="space-y-1.5">
                  <Label htmlFor="rule-action-command">Comando</Label>
                  {commands.loading ? <p className="text-sm text-muted-foreground">Verificando comandos declarados…</p> : commands.data?.length ? (
                    <Select value={actionCommandType} onValueChange={setActionCommandType}>
                      <SelectTrigger id="rule-action-command" className="w-full"><SelectValue placeholder="Selecione um comando" /></SelectTrigger>
                      <SelectContent>{commands.data.map((command) => <SelectItem key={command.type} value={command.type}>{command.type}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <p className="text-sm text-muted-foreground">Este dispositivo não declarou comandos nesta interface.</p>}
                </div>
              ) : null}
              {actionCommandType && Object.keys(actionSchema).length > 0 ? (
                <div className="rounded-lg border p-3">
                  <ParametersForm idPrefix="rule-action" schema={actionSchema} values={actionValues} onChange={setActionValues} />
                </div>
              ) : null}
              <div className="space-y-1.5"><Label htmlFor="rule-id">ID da regra</Label><Input id="rule-id" value={id} onChange={(event) => setID(event.target.value)} placeholder="led-1-button_pressed-to-led-2" /></div>
              <div className="flex items-center gap-2"><Label htmlFor="rule-enabled">Habilitada</Label><Switch id="rule-enabled" checked={enabled} onCheckedChange={setEnabled} /></div>
              <Button type="submit" disabled={submitting || !id || !sourceDeviceId || !eventType || !actionDeviceId || !actionCommandType}>Criar regra</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Regras ativas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Carregando regras…</p> : null}
            {!loading && !rules?.length ? <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada.</p> : null}
            {rules?.map((rule) => (
              <div key={rule.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{rule.id}</p>
                    <p className="mt-1 break-all text-muted-foreground">{rule.sourceDeviceId} · {rule.eventType} → {rule.actionDeviceId} · {rule.actionCommandType}</p>
                    {rule.conditionJson ? <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{rule.conditionJson}</p> : <p className="mt-1 text-xs text-muted-foreground">Sem condição</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={rule.enabled} disabled={submitting} onCheckedChange={() => void toggle(rule)} aria-label={"Habilitar/desabilitar " + rule.id} />
                    <Button size="sm" variant="ghost" aria-label={"Remover " + rule.id} disabled={submitting} onClick={() => void remove(rule)}><Trash2 /></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
