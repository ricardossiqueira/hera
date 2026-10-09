import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import type { AutomationRuleV2 } from "@/api/device-v2";
import { removeAutomationRuleV2, setAutomationRuleEnabledV2 } from "@/api/device-v2";
import { queryKeys } from "@/api/queries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export function AutomationActions({ rule, detail = false, className = "" }: { rule: AutomationRuleV2; detail?: boolean; className?: string }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => setAutomationRuleEnabledV2(rule.id, enabled),
    onSuccess: async (updated) => {
      client.setQueryData<AutomationRuleV2[]>(queryKeys.automations, (current) => current?.map((item) => item.id === updated.id ? updated : item));
      await client.invalidateQueries({ queryKey: queryKeys.automations });
    },
  });
  const remove = useMutation({
    mutationFn: () => removeAutomationRuleV2(rule.id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.automations });
      setConfirmRemove(false);
      if (detail) await navigate({ to: "/automations" });
    },
  });
  const pending = toggle.isPending || remove.isPending;

  return <div className={`flex flex-wrap items-center gap-2 ${className}`} onClick={(event) => event.stopPropagation()}>
    <label className="inline-flex items-center gap-2 text-sm">
      <Switch aria-label={`${rule.enabled ? "Desabilitar" : "Habilitar"} ${rule.id}`} checked={rule.enabled} disabled={pending} onCheckedChange={(checked) => toggle.mutate(checked)} />
      <span>{rule.enabled ? "Habilitada" : "Desabilitada"}</span>
    </label>
    <Button variant="outline" size="sm" asChild><Link to="/automations/$ruleId/edit" params={{ ruleId: rule.id }} aria-label={`Editar ${rule.id}`}><Pencil /> Editar</Link></Button>
    <Button variant="destructive" size="sm" aria-label={`Remover ${rule.id}`} disabled={pending} onClick={() => { remove.reset(); setConfirmRemove(true); }}><Trash2 /> Remover</Button>
    {toggle.error ? <p role="alert" className="basis-full text-sm text-destructive">{toggle.error.message}</p> : null}
    {toggle.isPending || remove.isPending ? <span role="status" className="sr-only">Salvando automação {rule.id}</span> : null}
    <Dialog open={confirmRemove} onOpenChange={(open) => { if (!remove.isPending) setConfirmRemove(open); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover automação?</DialogTitle>
          <DialogDescription>A regra “{rule.id}” será removida e deixará de executar. Essa ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        {remove.error ? <Alert variant="destructive"><AlertDescription>{remove.error.message}</AlertDescription></Alert> : null}
        <DialogFooter>
          <Button variant="outline" disabled={remove.isPending} onClick={() => setConfirmRemove(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? "Removendo..." : "Confirmar remoção"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
