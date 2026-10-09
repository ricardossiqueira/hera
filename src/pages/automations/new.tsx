import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { type AutomationRuleV2, type OutputChannel, createAutomationRuleV2, updateAutomationRuleV2, type RegisteredDeviceV2 } from "@/api/device-v2";
import { automationsQuery, queryKeys } from "@/api/queries";
import { useHera } from "@/context/hera-context";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionNodeData } from "@/components/automation-flow/action-node";
import type { ConditionNodeData } from "@/components/automation-flow/condition-flow/types";
import type { EventNodeData } from "@/components/automation-flow/event-node";
import { RuleCanvas } from "@/components/automation-flow/rule-canvas";
import { coerceParameterValues } from "@/components/parameters-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function commandsFor(device?: RegisteredDeviceV2) { return device?.manifest.mqtt.subscribe.flatMap((entry) => entry.commands) ?? []; }
function valuesFromRule(rule?: AutomationRuleV2): Record<string, string | boolean> {
  return Object.fromEntries(Object.entries(rule?.action.parameters ?? {}).map(([name, value]) => [name, typeof value === "boolean" ? value : String(value)]));
}

export function NewAutomation() { return <AutomationForm />; }

export function EditAutomation() {
  const { ruleId } = useParams({ from: "/app/automations/$ruleId/edit" });
  const { data: rules, error, isPending } = useQuery(automationsQuery);
  const rule = rules?.find((item) => item.id === ruleId);
  if (error) return <>
    <PageHeading title="Editar automação" description="Não foi possível carregar esta regra para edição." action={<Button variant="outline" asChild><Link to="/automations">Voltar</Link></Button>} />
    <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>
  </>;
  if (!rule) return <Card><CardContent>{isPending ? "Carregando automação..." : <p role="alert">Automação não encontrada.</p>}</CardContent></Card>;
  return <AutomationForm key={rule.id} initialRule={rule} />;
}

function AutomationForm({ initialRule }: { initialRule?: AutomationRuleV2 }) {
  const navigate = useNavigate();
  const { devices: { data: devices, error: devicesError } } = useHera();
  const client = useQueryClient();
  const editing = Boolean(initialRule);
  const [id, setId] = useState(initialRule?.id ?? "");
  const [sourceDeviceId, setSourceDeviceId] = useState(initialRule?.trigger.sourceDeviceId ?? "");
  const [outputChannel, setOutputChannel] = useState<OutputChannel | "">(initialRule?.trigger.outputChannel ?? "");
  const [eventType, setEventType] = useState(initialRule?.trigger.eventType ?? "");
  const [ignoreRetained, setIgnoreRetained] = useState(initialRule?.trigger.ignoreRetained ?? true);
  const [conditionJson, setConditionJson] = useState(initialRule?.trigger.conditionJson ?? "");
  const [targetDeviceId, setTargetDeviceId] = useState(initialRule?.action.targetDeviceId ?? "");
  const [commandType, setCommandType] = useState(initialRule?.action.commandType ?? "");
  const [actionValues, setActionValues] = useState<Record<string, string | boolean>>(() => valuesFromRule(initialRule));
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
  const mutation = useMutation({
    mutationFn: editing ? updateAutomationRuleV2 : createAutomationRuleV2,
    onSuccess: async (rule) => {
      await client.invalidateQueries({ queryKey: queryKeys.automations });
      if (editing) await navigate({ to: "/automations/$ruleId", params: { ruleId: rule.id } });
      else await navigate({ to: "/automations" });
    },
  });
  const error = mutation.error?.message ?? devicesError;

  const source = devices?.find((device) => device.deviceId === sourceDeviceId);
  const target = devices?.find((device) => device.deviceId === targetDeviceId);
  const outputChannelOptions = useMemo(() => (source?.manifest.mqtt.publish ?? []).map((output) => output.channel), [source]);
  const selectedOutput = source?.manifest.mqtt.publish.find((output) => output.channel === outputChannel);
  const commands = commandsFor(target);
  const selectedCommand = commands.find((command) => command.type === commandType);
  const actionSchema = selectedCommand?.parameters ?? {};
  const fieldSuggestions = useMemo(() => {
    if (outputChannel === "event") return Object.keys(selectedOutput?.events?.find((event) => event.type === eventType)?.payload ?? {});
    return Object.keys(selectedOutput?.schema ?? {});
  }, [outputChannel, selectedOutput, eventType]);
  const sidebarDevices = useMemo(() => (devices ?? [])
    .filter((device) => device.manifest.mqtt.publish.length || device.manifest.mqtt.subscribe.some((entry) => entry.commands.length))
    .map((device) => ({ id: device.deviceId, supportsEvent: device.manifest.mqtt.publish.length > 0, supportsCommand: device.manifest.mqtt.subscribe.some((entry) => entry.commands.length > 0) })), [devices]);
  const valid = Boolean(id && source && outputChannel && selectedOutput && target && selectedCommand
    && (outputChannel !== "event" || eventType) && (outputChannel !== "state" || ignoreRetained));

  useEffect(() => {
    if (editing || id || !sourceDeviceId || !outputChannel || !targetDeviceId) return;
    if (outputChannel === "event" && !eventType) return;
    setId(sourceDeviceId + "-" + (outputChannel === "event" ? eventType : outputChannel) + "-to-" + targetDeviceId);
  }, [editing, id, sourceDeviceId, outputChannel, eventType, targetDeviceId]);

  const changeSourceDevice = (next: string) => { setSourceDeviceId(next); setOutputChannel(""); setEventType(""); setIgnoreRetained(true); };
  const changeOutputChannel = (channel: OutputChannel) => { setOutputChannel(channel); setEventType(""); };
  const changeTargetDevice = (next: string) => { setTargetDeviceId(next); setCommandType(""); setActionValues({}); };

  const submit = () => {
    if (!valid || !source || !target || !selectedCommand) return;
    const typedParameters = coerceParameterValues(actionSchema, actionValues);
    const sameCommand = initialRule?.action.targetDeviceId === targetDeviceId && initialRule.action.commandType === commandType;
    const preservedUnknownParameters = sameCommand
      ? Object.fromEntries(Object.entries(initialRule.action.parameters).filter(([name]) => !(name in actionSchema)))
      : {};
    const parameters = { ...preservedUnknownParameters, ...typedParameters };
    const rule: Omit<AutomationRuleV2, "updatedAt"> = {
      id, enabled,
      trigger: {
        sourceDeviceId, outputChannel: outputChannel as OutputChannel,
        eventType: outputChannel === "event" ? eventType : undefined,
        ignoreRetained: outputChannel === "state" ? ignoreRetained : undefined,
        conditionJson: conditionJson || undefined,
      },
      action: { targetDeviceId, commandType, parameters },
    };
    mutation.mutate(rule);
  };

  const mode = editing ? "edit" : "create";
  const eventData: EventNodeData = {
    mode, deviceId: sourceDeviceId, eventType, outputChannel, outputChannelOptions, ignoreRetained,
    eventTypeOptions: selectedOutput?.events?.map((event) => event.type) ?? [],
    onDeviceChange: changeSourceDevice, onEventTypeChange: setEventType,
    onOutputChannelChange: changeOutputChannel, onIgnoreRetainedChange: setIgnoreRetained,
  };
  const conditionData: ConditionNodeData = { mode, conditionJson, fieldSuggestions, onChange: setConditionJson };
  const actionData: ActionNodeData = {
    mode, deviceId: targetDeviceId, commandType,
    commandOptions: commands, parametersSchema: actionSchema, parametersValues: actionValues, parametersJson: "",
    onDeviceChange: changeTargetDevice, onCommandChange: setCommandType, onParametersChange: setActionValues,
  };

  return <>
    <PageHeading title={editing ? `Editar automação: ${id}` : "Nova automação"} description="Selecione um bloco no canvas e arraste da barra lateral o que quer colocar nele." action={<Button variant="outline" asChild><Link to={editing ? "/automations/$ruleId" : "/automations"} params={editing ? { ruleId: id } : undefined}>Cancelar</Link></Button>} />
    {error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <RuleCanvas key={initialRule?.id ?? "new"} devices={sidebarDevices} eventData={eventData} conditionData={conditionData} actionData={actionData} />
    <Card className="mt-4">
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="automation-id">ID da regra</Label>
          <Input id="automation-id" className="w-64" value={id} readOnly={editing} onChange={(event) => setId(event.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="automation-enabled">Habilitada</Label>
          <Switch id="automation-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <Button className="ml-auto" disabled={!valid || mutation.isPending} onClick={submit}>
          {mutation.isPending ? "Salvando..." : editing ? "Salvar alterações" : "Criar regra"}
        </Button>
      </CardContent>
    </Card>
  </>;
}
