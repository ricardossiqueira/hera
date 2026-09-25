import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { type AutomationRule, listAutomationRules, removeAutomationRule, setAutomationRuleEnabled } from "@/api/gateway";
import type { ActionNodeData } from "@/components/automation-flow/action-node";
import type { ConditionNodeData } from "@/components/automation-flow/condition-node";
import type { EventNodeData } from "@/components/automation-flow/event-node";
import { RuleCanvas } from "@/components/automation-flow/rule-canvas";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGateway } from "@/context/gateway-context";

export function AutomationDetail() {
  const { ruleId } = useParams({ from: "/automations/$ruleId" });
  const navigate = useNavigate();
  const { reportError } = useGateway();
  const [rule, setRule] = useState<AutomationRule>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // No GetAutomationRule RPC (same scope decision as ListAutomationRules-
  // only in Marco 5, docs/device-manifests.md): reusing the list is
  // enough for a single lab-scale device fleet.
  useEffect(() => {
    let active = true;
    setLoading(true);
    void listAutomationRules()
      .then((rules) => {
        if (!active) return;
        const found = rules.find((item) => item.id === ruleId);
        if (found) setRule(found); else setNotFound(true);
      })
      .catch((error: unknown) => {
        if (active) reportError("Automações: " + (error instanceof Error ? error.message : "não foi possível carregar a regra."));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ruleId, reportError]);

  if (loading && !rule) return <Card><CardContent>Carregando regra…</CardContent></Card>;
  if (notFound || !rule) {
    return (
      <Card>
        <CardContent>
          <p className="text-destructive">Regra não encontrada.</p>
          <Link to="/automations" className="mt-3 inline-block text-sm text-primary hover:underline">Voltar para automações</Link>
        </CardContent>
      </Card>
    );
  }

  const toggle = async (next: boolean) => {
    setSubmitting(true);
    try {
      const response = await setAutomationRuleEnabled(rule.id, next);
      setRule(response.rule);
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

  const eventData: EventNodeData = { mode: "detail", devices: [], deviceId: rule.sourceDeviceId, eventType: rule.eventType, eventTypeOptions: [] };
  const conditionData: ConditionNodeData = { mode: "detail", conditionJson: rule.conditionJson ?? "", fieldSuggestions: [] };
  const actionData: ActionNodeData = {
    mode: "detail", devices: [], deviceId: rule.actionDeviceId, commandType: rule.actionCommandType,
    commandOptions: [], parametersSchema: {}, parametersValues: {}, parametersJson: rule.actionParametersJson,
  };

  return (
    <>
      <PageHeading
        title={rule.id}
        description="Regras não são editáveis depois de criadas - remova e crie uma nova para mudar algo."
        action={<Button variant="outline" asChild><Link to="/automations">Voltar</Link></Button>}
      />
      <RuleCanvas eventData={eventData} conditionData={conditionData} actionData={actionData} />
      <Card className="mt-4">
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="automation-detail-enabled">Habilitada</Label>
            <Switch id="automation-detail-enabled" checked={rule.enabled} disabled={submitting} onCheckedChange={(next) => void toggle(next)} />
          </div>
          <Button className="ml-auto" variant="destructive" disabled={submitting} onClick={() => void remove()}>
            <Trash2 /> Remover regra
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
