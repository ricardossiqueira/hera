import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { type AutomationRule, listAutomationRules } from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGateway } from "@/context/gateway-context";

export function AutomationsList() {
  const { reportError } = useGateway();
  const [rules, setRules] = useState<AutomationRule[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Fetched locally, once per visit - same pattern routes.tsx/manifests.tsx
  // already use, not the context's continuously-repolled resources (that
  // polling is exactly what caused the old shared canvas to reset every
  // 10s - see the plan this page was rebuilt from).
  const refresh = async () => {
    setLoading(true);
    try {
      setRules(await listAutomationRules());
      setError(undefined);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "não foi possível carregar as regras.";
      setError(message);
      reportError("Automações: " + message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  return (
    <>
      <PageHeading
        title="Automações"
        description="Regras evento → condição → ação. Cada uma tem seu próprio canvas - clique numa regra para ver ou remover."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw /> Atualizar</Button>
            <Button asChild><Link to="/automations/new"><Plus /> Nova automação</Link></Button>
          </div>
        }
      />
      {loading && !rules ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12" />)}
        </div>
      ) : null}
      {error && !rules ? (
        <Card>
          <CardContent>
            <p className="text-destructive">Não foi possível carregar automações.</p>
            <p className="mt-1 text-sm text-destructive/80">{error}</p>
          </CardContent>
        </Card>
      ) : null}
      {rules && rules.length === 0 ? (
        <Card><CardContent><p className="text-sm text-muted-foreground">Nenhuma automação cadastrada.</p></CardContent></Card>
      ) : null}
      {rules && rules.length > 0 ? (
        <>
          <Card className="hidden overflow-hidden p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>Habilitada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Link to="/automations/$ruleId" params={{ ruleId: rule.id }} className="font-medium text-primary hover:underline">
                        {rule.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{rule.sourceDeviceId} · {rule.eventType}</TableCell>
                    <TableCell className="text-muted-foreground">{rule.actionDeviceId} · {rule.actionCommandType}</TableCell>
                    <TableCell className="text-muted-foreground">{rule.conditionJson ? "Sim" : "—"}</TableCell>
                    <TableCell><Badge variant={rule.enabled ? "success" : "outline"}>{rule.enabled ? "Sim" : "Não"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="grid gap-3 md:hidden">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="flex items-start justify-between gap-3">
                  <div>
                    <Link to="/automations/$ruleId" params={{ ruleId: rule.id }} className="font-medium text-primary hover:underline">
                      {rule.id}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{rule.sourceDeviceId} · {rule.eventType} → {rule.actionDeviceId} · {rule.actionCommandType}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Condição: {rule.conditionJson ? "sim" : "—"}</p>
                  </div>
                  <Badge variant={rule.enabled ? "success" : "outline"}>{rule.enabled ? "Habilitada" : "Desabilitada"}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
