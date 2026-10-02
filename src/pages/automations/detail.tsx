import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { type AutomationRule, listAutomationRules, removeAutomationRule, updateAutomationRule } from "@/api/gateway";
import type { ActionNodeData } from "@/components/automation-flow/action-node";
import type { ConditionNodeData } from "@/components/automation-flow/condition-flow/types";
import type { EventNodeData } from "@/components/automation-flow/event-node";
import { RuleCanvas } from "@/components/automation-flow/rule-canvas";
import { coerceParameterValues, type ParameterSchema, parseParameterSchema } from "@/components/parameters-form";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDeviceCommands, useDeviceEvents, useGateway } from "@/context/gateway-context";

function payloadFields(payloadJson?: string): string[] {
  try { return Object.keys(payloadJson ? JSON.parse(payloadJson) as Record<string, unknown> : {}); } catch { return []; }
}

function savedParameters(parametersJson: string): { schema: ParameterSchema; values: Record<string, string | boolean> } {
  try {
    const parameters = JSON.parse(parametersJson) as Record<string, unknown>;
    const schema: ParameterSchema = {};
    const values: Record<string, string | boolean> = {};
    for (const [name, value] of Object.entries(parameters)) {
      if (typeof value === "boolean") { schema[name] = { type: "boolean" }; values[name] = value; }
      else if (typeof value === "number") { schema[name] = { type: "number" }; values[name] = String(value); }
      else if (typeof value === "string") { schema[name] = { type: "string" }; values[name] = value; }
    }
    return { schema, values };
  } catch {
    return { schema: {}, values: {} };
  }
}

export function AutomationDetail() {
  const { ruleId } = useParams({ from: "/automations/$ruleId" });
  const navigate = useNavigate();
  const { reportError } = useGateway();
  const [rule, setRule] = useState<AutomationRule>();
  const [sourceDeviceId, setSourceDeviceId] = useState("");
  const [eventType, setEventType] = useState("");
  const [conditionJson, setConditionJson] = useState("");
  const [actionDeviceId, setActionDeviceId] = useState("");
  const [actionCommandType, setActionCommandType] = useState("");
  const [actionValues, setActionValues] = useState<Record<string, string | boolean>>({});
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const events = useDeviceEvents(sourceDeviceId || undefined);
  const commands = useDeviceCommands(actionDeviceId || undefined);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    void listAutomationRules()
      .then((rules) => {
        if (!active) return;
        const found = rules.find((item) => item.id === ruleId);
        if (!found) { setNotFound(true); return; }
        const parameters = savedParameters(found.actionParametersJson);
        setRule(found);
        setSourceDeviceId(found.sourceDeviceId);
        setEventType(found.eventType);
        setConditionJson(found.conditionJson ?? "");
        setActionDeviceId(found.actionDeviceId);
        setActionCommandType(found.actionCommandType);
        setActionValues(parameters.values);
        setEnabled(found.enabled);
      })
      .catch((error: unknown) => {
        if (active) reportError("Automações: " + (error instanceof Error ? error.message : "não foi possível carregar a regra."));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ruleId, reportError]);

  const selectedEvent = events.data?.find((event) => event.type === eventType);
  const selectedCommand = commands.data?.find((command) => command.type === actionCommandType);
  const actionSchema = parseParameterSchema(selectedCommand?.parametersJson);
  const fieldSuggestions = useMemo(() => payloadFields(selectedEvent?.payloadJson), [selectedEvent?.payloadJson]);

  if (loading && !rule) return <Card><CardContent>Carregando regra…</CardContent></Card>;
  if (notFound || !rule) return <Card><CardContent><p className="text-destructive">Regra não encontrada.</p><Link to="/automations" className="mt-3 inline-block text-sm text-primary hover:underline">Voltar para automações</Link></CardContent></Card>;

  const changeSourceDevice = (next: string) => { setSourceDeviceId(next); setEventType(""); };
  const changeActionDevice = (next: string) => { setActionDeviceId(next); setActionCommandType(""); setActionValues({}); };

  const save = async () => {
    if (!sourceDeviceId || !eventType || !actionDeviceId || !actionCommandType) return;
    setSubmitting(true);
    try {
      const response = await updateAutomationRule({
        id: rule.id, enabled, sourceDeviceId, eventType, conditionJson, actionDeviceId, actionCommandType,
        actionParametersJson: JSON.stringify(coerceParameterValues(actionSchema, actionValues)),
      });
      const updated = response.rule;
      setRule(updated);
      setConditionJson(updated.conditionJson ?? "");
      setActionValues(savedParameters(updated.actionParametersJson).values);
      setEnabled(updated.enabled);
    } catch (error) {
      reportError("Atualizar regra: " + (error instanceof Error ? error.message : "falha inesperada"));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    setSubmitting(true);
    try {
      await removeAutomationRule(rule.id);
      await navigate({ to: "/automations" });
    } catch (error) {
      reportError("Remover regra: " + (error instanceof Error ? error.message : "falha inesperada"));
      setSubmitting(false);
    }
  };

  const eventData: EventNodeData = {
    mode: "edit", deviceId: sourceDeviceId, eventType,
    eventTypeOptions: (events.data ?? []).map((event) => event.type),
    onDeviceChange: changeSourceDevice, onEventTypeChange: setEventType,
  };
  const conditionData: ConditionNodeData = { mode: "edit", conditionJson, fieldSuggestions, onChange: setConditionJson };
  const actionData: ActionNodeData = {
    mode: "edit", deviceId: actionDeviceId, commandType: actionCommandType,
    commandOptions: commands.data ?? [], parametersSchema: actionSchema, parametersValues: actionValues, parametersJson: "",
    onDeviceChange: changeActionDevice, onCommandChange: setActionCommandType, onParametersChange: setActionValues,
  };

  return <>
    <PageHeading title={rule.id} description="Edite o fluxo e salve as alterações para atualizar esta automação." action={<Button variant="outline" asChild><Link to="/automations">Voltar</Link></Button>} />
    <RuleCanvas eventData={eventData} conditionData={conditionData} actionData={actionData} />
    <Card className="mt-4"><CardContent className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2"><Label htmlFor="automation-detail-enabled">Habilitada</Label><Switch id="automation-detail-enabled" checked={enabled} disabled={submitting} onCheckedChange={setEnabled} /></div>
      <Button className="ml-auto" disabled={submitting || events.loading || commands.loading || !sourceDeviceId || !eventType || !actionDeviceId || !actionCommandType} onClick={() => void save()}>Salvar alterações</Button>
      <Button variant="destructive" disabled={submitting} onClick={() => void remove()}><Trash2 /> Remover regra</Button>
    </CardContent></Card>
  </>;
}
