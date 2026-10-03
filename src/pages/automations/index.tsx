import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { type AutomationRuleV2, listAutomationRulesV2, outputLabel } from "@/api/device-v2";
import { LinkedTableRow } from "@/components/linked-table-row";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AutomationsList() {
  const [rules, setRules] = useState<AutomationRuleV2[]>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const refresh = async () => { setLoading(true); try { setRules(await listAutomationRulesV2()); setError(undefined); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar automações."); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); }, []);
  return <>
    <PageHeading title="Automações" description="Regras que conectam os dados de um dispositivo às ações de outro." action={<div className="flex gap-2"><Button variant="outline" disabled={loading} onClick={() => void refresh()}><RefreshCw /> Atualizar</Button><Button asChild><Link to="/automations/new"><Plus /> Nova automação</Link></Button></div>} />
    {loading && !rules ? <div className="space-y-2">{Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-14" />)}</div> : null}
    {error ? <Card><CardContent><p className="text-destructive">{error}</p></CardContent></Card> : null}
    {rules?.length === 0 ? <Card><CardContent><p className="text-sm text-muted-foreground">Nenhuma automação. Crie a primeira ligação entre uma saída e um comando.</p></CardContent></Card> : null}
    {rules?.length ? <Card className="overflow-hidden p-0"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Trigger</TableHead><TableHead>Condição</TableHead><TableHead>Ação</TableHead><TableHead /></TableRow></TableHeader><TableBody>{rules.map((rule) => <LinkedTableRow key={rule.id}><TableCell><Link data-row-link className="font-medium text-primary hover:underline" to="/automations/$ruleId" params={{ ruleId: rule.id }}>{rule.id}</Link></TableCell><TableCell>{rule.trigger.sourceDeviceId}<span className="block text-xs text-muted-foreground">{outputLabel(rule.trigger.outputChannel)}{rule.trigger.eventType ? ` · ${rule.trigger.eventType}` : ""}</span></TableCell><TableCell>{rule.trigger.conditionJson ? <Badge variant="outline">JSONLogic</Badge> : <span className="text-muted-foreground">Sempre</span>}</TableCell><TableCell>{rule.action.targetDeviceId}<span className="block font-mono text-xs text-muted-foreground">{rule.action.commandType}</span></TableCell><TableCell><Badge variant={rule.enabled ? "success" : "outline"}>{rule.enabled ? "ativa" : "desativada"}</Badge></TableCell></LinkedTableRow>)}</TableBody></Table></Card> : null}
  </>;
}
