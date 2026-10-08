import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { automationsQuery } from "@/api/queries";
import { RuleCanvas } from "@/components/automation-flow/rule-canvas";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export function AutomationDetail() {
  const { ruleId } = useParams({ from: "/app/automations/$ruleId" });
  const { data: rules, error: queryError, isPending } = useQuery(automationsQuery);
  const rule = rules?.find((item) => item.id === ruleId);
  const error = queryError?.message ?? (!isPending && !rule ? "Automação não encontrada." : undefined);

  return <>
    <PageHeading title={ruleId} description="Detalhes da automação. Visualização somente leitura." action={<Button variant="outline" asChild><Link to="/automations"><ArrowLeft /> Voltar</Link></Button>} />
    {error ? <Card><CardContent><p role="alert" className="text-destructive">{error}</p></CardContent></Card> : null}
    {!rule && !error ? <Card><CardContent>Carregando automação…</CardContent></Card> : null}
    {rule ? <>
      <Card className="mb-4"><CardContent className="flex flex-wrap items-center gap-4 text-sm">
        <Badge variant={rule.enabled ? "success" : "outline"}>{rule.enabled ? "Ativa" : "Desativada"}</Badge>
        <span>Atualizada em {formatDate(rule.updatedAt)}</span>
        <Link to="/devices/$deviceId" params={{ deviceId: rule.trigger.sourceDeviceId }} className="text-primary hover:underline">Origem: {rule.trigger.sourceDeviceId}</Link>
        <Link to="/devices/$deviceId" params={{ deviceId: rule.action.targetDeviceId }} className="text-primary hover:underline">Destino: {rule.action.targetDeviceId}</Link>
      </CardContent></Card>
      <RuleCanvas key={rule.id} devices={[]}
        eventData={{ mode: "read_only", deviceId: rule.trigger.sourceDeviceId, outputChannel: rule.trigger.outputChannel, outputChannelOptions: [rule.trigger.outputChannel], eventType: rule.trigger.eventType ?? "", eventTypeOptions: rule.trigger.eventType ? [rule.trigger.eventType] : [], ignoreRetained: rule.trigger.ignoreRetained }}
        conditionData={{ mode: "read_only", conditionJson: rule.trigger.conditionJson ?? "", fieldSuggestions: [] }}
        actionData={{ mode: "read_only", deviceId: rule.action.targetDeviceId, commandType: rule.action.commandType, commandOptions: [{ type: rule.action.commandType }], parametersSchema: {}, parametersValues: {}, parametersJson: JSON.stringify(rule.action.parameters) }}
      />
      <Card className="mt-4"><CardContent className="grid gap-4 text-sm md:grid-cols-2">
        <div><h2 className="mb-2 font-medium">Condição</h2><pre className="overflow-auto rounded bg-muted p-3 text-xs">{rule.trigger.conditionJson || "Sempre"}</pre></div>
        <div><h2 className="mb-2 font-medium">Parâmetros do comando</h2><pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(rule.action.parameters, null, 2)}</pre></div>
      </CardContent></Card>
    </> : null}
  </>;
}
