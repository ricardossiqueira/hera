import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { type AutomationRuleV2, type OutputChannel, createAutomationRuleV2, listDevicesV2, type RegisteredDeviceV2 } from "@/api/device-v2";
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
  const [actionValues, setActionValues] = useState<Record<string, string | boolean>>({});
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void listDevicesV2().then(setDevices).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao carregar interfaces.")); }, []);

  const source = devices?.find((device) => device.deviceId === sourceDeviceId);
  const target = devices?.find((device) => device.deviceId === targetDeviceId);
  const outputChannelOptions = useMemo(() => (source?.manifest.mqtt.publish ?? []).map((output) => output.channel), [source]);
  const selectedOutput = source?.manifest.mqtt.publish.find((output) => output.channel === outputChannel);
  const commands = commandsFor(target);
  const selectedCommand = commands.find((command) => command.type === commandType);
  const actionSchema = selectedCommand?.parameters ?? {};
  // Comparison field suggestions come from whatever schema the chosen
  // channel actually carries: the event's own payload for "event", the
  // channel's declared schema for telemetry/state/command-result.
  const fieldSuggestions = useMemo(() => {
    if (outputChannel === "event") return Object.keys(selectedOutput?.events?.find((event) => event.type === eventType)?.payload ?? {});
    return Object.keys(selectedOutput?.schema ?? {});
  }, [outputChannel, selectedOutput, eventType]);

  const sidebarDevices = useMemo(() => (devices ?? [])
    .filter((device) => device.manifest.mqtt.publish.length || device.manifest.mqtt.subscribe.some((entry) => entry.commands.length))
    .map((device) => ({ id: device.deviceId, supportsEvent: device.manifest.mqtt.publish.length > 0, supportsCommand: device.manifest.mqtt.subscribe.some((entry) => entry.commands.length > 0) })), [devices]);

  const valid = Boolean(id && source && outputChannel && selectedOutput && target && selectedCommand
    && (outputChannel !== "event" || eventType) && (outputChannel !== "state" || ignoreRetained));

  // Suggests an id once the required fields are picked, same convenience
  // the old react-flow new.tsx had - never overwrites one the user typed.
  useEffect(() => {
    if (id || !sourceDeviceId || !outputChannel || !targetDeviceId) return;
    if (outputChannel === "event" && !eventType) return;
    setId(sourceDeviceId + "-" + (outputChannel === "event" ? eventType : outputChannel) + "-to-" + targetDeviceId);
  }, [id, sourceDeviceId, outputChannel, eventType, targetDeviceId]);

  const changeSourceDevice = (next: string) => { setSourceDeviceId(next); setOutputChannel(""); setEventType(""); setIgnoreRetained(true); };
  const changeOutputChannel = (channel: OutputChannel) => { setOutputChannel(channel); setEventType(""); };
  const changeTargetDevice = (next: string) => { setTargetDeviceId(next); setCommandType(""); setActionValues({}); };

  const submit = async () => {
    if (!valid || !source || !target || !selectedCommand) return;
    const rule: Omit<AutomationRuleV2, "updatedAt"> = {
      id, enabled,
      trigger: {
        sourceDeviceId, outputChannel: outputChannel as OutputChannel,
        eventType: outputChannel === "event" ? eventType : undefined,
        ignoreRetained: outputChannel === "state" ? ignoreRetained : undefined,
        conditionJson: conditionJson || undefined,
      },
      action: { targetDeviceId, commandType, parameters: coerceParameterValues(actionSchema, actionValues) },
    };
    setSubmitting(true); setError(undefined);
    try { await createAutomationRuleV2(rule); await navigate({ to: "/automations" }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar automação."); }
    finally { setSubmitting(false); }
  };

  const eventData: EventNodeData = {
    mode: "create", deviceId: sourceDeviceId, eventType, outputChannel, outputChannelOptions, ignoreRetained,
    eventTypeOptions: selectedOutput?.events?.map((event) => event.type) ?? [],
    onDeviceChange: changeSourceDevice, onEventTypeChange: setEventType,
    onOutputChannelChange: changeOutputChannel, onIgnoreRetainedChange: setIgnoreRetained,
  };
  const conditionData: ConditionNodeData = { mode: "create", conditionJson, fieldSuggestions, onChange: setConditionJson };
  const actionData: ActionNodeData = {
    mode: "create", deviceId: targetDeviceId, commandType,
    commandOptions: commands, parametersSchema: actionSchema, parametersValues: actionValues, parametersJson: "",
    onDeviceChange: changeTargetDevice, onCommandChange: setCommandType, onParametersChange: setActionValues,
  };

  return <>
    <PageHeading title="Nova automação" description="Selecione um bloco no canvas e arraste da barra lateral o que quer colocar nele." />
    {error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <RuleCanvas devices={sidebarDevices} eventData={eventData} conditionData={conditionData} actionData={actionData} />
    <Card className="mt-4">
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-automation-id">ID da regra</Label>
          <Input id="new-automation-id" className="w-64" value={id} onChange={(event) => setId(event.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="new-automation-enabled">Habilitada</Label>
          <Switch id="new-automation-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <Button className="ml-auto" disabled={!valid || submitting} onClick={() => void submit()}>
          {submitting ? "Criando…" : "Criar regra"}
        </Button>
      </CardContent>
    </Card>
  </>;
}
