import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, Layers, Plus, Radio, RefreshCw, Workflow, Zap } from "lucide-react";
import { outputLabel } from "@/api/device-v2";
import { automationsQuery } from "@/api/queries";
import { PageHeading } from "@/components/page-heading";
import { ResourceEmpty, ResourceField, ResourceIdentity, ResourceList, ResourceListItem, ResourceNote, SummaryStrip, matchesSearch } from "@/components/resource-list";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { AutomationActions } from "@/pages/automations/actions";

export function AutomationsList() {
  const { data: rules, error: queryError, isFetching: loading, refetch } = useQuery(automationsQuery);
  const error = queryError?.message;
  const refresh = () => refetch({ cancelRefetch: false });
  const [query, setQuery] = useState("");
  const visible = rules?.filter((rule) => matchesSearch(query, rule.id, rule.trigger.sourceDeviceId, rule.action.targetDeviceId, rule.action.commandType, outputLabel(rule.trigger.outputChannel), rule.trigger.eventType, rule.enabled ? "Habilitada" : "Desabilitada")) ?? [];

  return <>
    <PageHeading eyebrow="Meu gateway" title="Automações" description="Eventos, condições e ações. Tudo conectado."
      action={<div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={loading} onClick={() => void refresh()}><RefreshCw className={loading ? "motion-safe:animate-spin" : ""} /> Atualizar</Button>
        <Button asChild><Link to="/automations/new"><Plus /> Nova automação</Link></Button>
      </div>} />
    <SummaryStrip items={[
      { label: "Automações", value: rules?.length, note: "Conexões entre dispositivos" },
      { label: "Habilitadas", value: rules?.filter((rule) => rule.enabled).length, note: "Regras habilitadas no gateway" },
      { label: "Desabilitadas", value: rules?.filter((rule) => !rule.enabled).length, note: "Regras desabilitadas no gateway" },
    ]} />
    <ResourceList title="Suas automações" searchLabel="Buscar por automação, dispositivo ou comando" query={query} onQueryChange={setQuery} total={rules?.length} visible={visible.length} loading={loading} error={error}
      empty={<ResourceEmpty icon={Workflow} title="Conecte o primeiro evento a uma ação" action={<Button variant="outline" asChild><Link to="/automations/new">Criar automação</Link></Button>}>Nenhuma automação. Crie a primeira ligação entre uma saída e um comando.</ResourceEmpty>}>
      {visible.map((rule) => <ResourceListItem key={rule.id} flow>
        <Link to="/automations/$ruleId" params={{ ruleId: rule.id }} aria-label={rule.id}>
          <span className="resource-flow-heading">
            <ResourceIdentity icon={Workflow} name={rule.id}><span>{rule.trigger.sourceDeviceId} → {rule.action.targetDeviceId}</span></ResourceIdentity>
            <span className="resource-state"><StatusIndicator state={rule.enabled ? "online" : "pending"}>{rule.enabled ? "Habilitada" : "Desabilitada"}</StatusIndicator><ChevronRight aria-hidden="true" /></span>
          </span>
          <span className="automation-path">
            <ResourceField label="Evento"><strong className="font-normal">{rule.trigger.sourceDeviceId}</strong><small><Radio className="mr-1 inline" aria-hidden="true" />{outputLabel(rule.trigger.outputChannel)}{rule.trigger.eventType ? ` · ${rule.trigger.eventType}` : ""}</small></ResourceField>
            <ArrowRight aria-hidden="true" />
            <ResourceField label="Condição"><span>{rule.trigger.conditionJson ? "JSONLogic" : "Sempre"}</span><small><Layers className="mr-1 inline" aria-hidden="true" />{rule.trigger.conditionJson ? "Condição configurada" : "Em cada atualização"}</small></ResourceField>
            <ArrowRight aria-hidden="true" />
            <ResourceField label="Ação"><strong className="font-normal">{rule.action.targetDeviceId}</strong><small><Zap className="mr-1 inline" aria-hidden="true" />{rule.action.commandType}</small></ResourceField>
          </span>
        </Link>
        <AutomationActions rule={rule} className="px-3 pb-4" />
      </ResourceListItem>)}
    </ResourceList>
    <ResourceNote icon={Workflow} title="Um caminho claro entre o que acontece e o que fazer">Abra uma automação para explorar seu fluxo completo, as condições e os parâmetros do comando.</ResourceNote>
  </>;
}
