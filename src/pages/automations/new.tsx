import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createAutomationRule } from "@/api/gateway";
import type { ActionNodeData } from "@/components/automation-flow/action-node";
import type { ConditionNodeData } from "@/components/automation-flow/condition-node";
import type { EventNodeData } from "@/components/automation-flow/event-node";
import { RuleCanvas } from "@/components/automation-flow/rule-canvas";
import { coerceParameterValues, parseParameterSchema } from "@/components/parameters-form";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDeviceCommands, useDeviceEvents, useGateway } from "@/context/gateway-context";

function payloadFields(payloadJson?: string): string[] {
  try {
    const schema = payloadJson ? JSON.parse(payloadJson) as Record<string, unknown> : {};
    return Object.keys(schema);
  } catch {
    return [];
  }
}

export function NewAutomation() {
  const navigate = useNavigate();
  const { devices, reportError } = useGateway();
  const [sourceDeviceId, setSourceDeviceId] = useState("");
  const [eventType, setEventType] = useState("");
  const [conditionJson, setConditionJson] = useState("");
  const [actionDeviceId, setActionDeviceId] = useState("");
  const [actionCommandType, setActionCommandType] = useState("");
  const [actionValues, setActionValues] = useState<Record<string, string | boolean>>({});
  const [id, setID] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const sourceDevices = useMemo(() => (devices.data ?? []).filter((device) => device.enabled && device.topics?.event), [devices.data]);
  const actionDevices = useMemo(() => (devices.data ?? []).filter((device) => device.enabled && device.topics?.command), [devices.data]);

  const events = useDeviceEvents(sourceDeviceId || undefined);
  const commands = useDeviceCommands(actionDeviceId || undefined);
  const selectedEvent = events.data?.find((event) => event.type === eventType);
  const selectedCommand = commands.data?.find((command) => command.type === actionCommandType);
  const actionSchema = parseParameterSchema(selectedCommand?.parametersJson);

  // Picking a different device invalidates whatever event/command type
  // was chosen for the previous one - same reasoning the old form had.
  useEffect(() => { setEventType(""); }, [sourceDeviceId]);
  useEffect(() => { setActionCommandType(""); setActionValues({}); }, [actionDeviceId]);
  useEffect(() => {
    if (!id && sourceDeviceId && eventType && actionDeviceId) setID(sourceDeviceId + "-" + eventType + "-to-" + actionDeviceId);
  }, [id, sourceDeviceId, eventType, actionDeviceId]);

  const eventData: EventNodeData = {
    mode: "create", devices: sourceDevices, deviceId: sourceDeviceId, eventType,
    eventTypeOptions: (events.data ?? []).map((event) => event.type),
    onDeviceChange: setSourceDeviceId, onEventTypeChange: setEventType,
  };
  const conditionData: ConditionNodeData = {
    mode: "create", conditionJson, fieldSuggestions: payloadFields(selectedEvent?.payloadJson), onChange: setConditionJson,
  };
  const actionData: ActionNodeData = {
    mode: "create", devices: actionDevices, deviceId: actionDeviceId, commandType: actionCommandType,
    commandOptions: commands.data ?? [], parametersSchema: actionSchema, parametersValues: actionValues, parametersJson: "",
    onDeviceChange: setActionDeviceId, onCommandChange: setActionCommandType, onParametersChange: setActionValues,
  };

  const submit = async () => {
    if (!id || !sourceDeviceId || !eventType || !actionDeviceId || !actionCommandType) return;
    setSubmitting(true);
    try {
      const response = await createAutomationRule({
        id, enabled, sourceDeviceId, eventType, conditionJson,
        actionDeviceId, actionCommandType, actionParametersJson: JSON.stringify(coerceParameterValues(actionSchema, actionValues)),
      });
      await navigate({ to: "/automations/$ruleId", params: { ruleId: response.rule.id } });
    } catch (error) {
      reportError("Criar regra: " + (error instanceof Error ? error.message : "falha inesperada"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeading title="Nova automação" description="Preencha os três blocos: o que observar, quando disparar, o que fazer." />
      <RuleCanvas eventData={eventData} conditionData={conditionData} actionData={actionData} />
      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-automation-id">ID da regra</Label>
            <Input id="new-automation-id" className="w-64" value={id} onChange={(event) => setID(event.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="new-automation-enabled">Habilitada</Label>
            <Switch id="new-automation-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <Button
            className="ml-auto"
            disabled={submitting || !id || !sourceDeviceId || !eventType || !actionDeviceId || !actionCommandType}
            onClick={() => void submit()}
          >
            Criar regra
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
