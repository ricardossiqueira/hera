import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import type { CommandDescriptor } from "@/api/gateway";
import { type ParameterSchema, ParametersForm } from "@/components/parameters-form";
import { TriggerButton } from "@/components/automation-flow/trigger-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ActionNodeData extends Record<string, unknown> {
  mode: "create" | "detail";
  // See event-node.tsx's doc comment on isSelected.
  isSelected?: boolean;
  deviceId: string;
  commandType: string;
  commandOptions: CommandDescriptor[];
  parametersSchema: ParameterSchema;
  parametersValues: Record<string, string | boolean>;
  parametersJson: string;
  // Called by rule-canvas.tsx's drop target - see event-node.tsx's doc
  // comment, same mechanism, mirrored here for the action side.
  onDeviceChange?: (deviceId: string) => void;
  onCommandChange?: (commandType: string) => void;
  onParametersChange?: (values: Record<string, string | boolean>) => void;
  // Detail mode only: fires this rule's action for real - see
  // trigger-button.tsx's doc comment.
  onTrigger?: () => Promise<void>;
}

export type ActionFlowNode = Node<ActionNodeData, "action">;

// ActionNode is the other fixed node - see event-node.tsx's doc comment
// for the device drop-zone, connectable-handle, nodrag/nopan-on-
// individual-controls, and isSelected reasoning, all mirrored here
// (target handle instead of source: Evento's connection lands here).
export function ActionNode({ data }: NodeProps<ActionFlowNode>) {
  return (
    <div className={"w-80 rounded-lg border bg-card text-card-foreground shadow-sm " + (data.isSelected ? "border-primary ring-2 ring-primary/30" : "border-border")}>
      <div className="border-b border-border px-3 py-2 text-sm font-medium">Ação</div>
      <div className="space-y-2 p-3">
        {data.mode === "create" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Dispositivo de ação</Label>
              {data.deviceId ? (
                <div className="flex items-center justify-between rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                  <span className="font-medium">{data.deviceId}</span>
                  <Button type="button" size="icon-xs" variant="ghost" className="nodrag nopan" aria-label="Remover dispositivo" onClick={() => data.onDeviceChange?.("")}>
                    <X />
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-input bg-background px-2 py-1.5 text-xs text-muted-foreground">
                  Arraste um dispositivo aqui
                </div>
              )}
            </div>
            {data.deviceId ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Comando</Label>
                {data.commandOptions.length ? (
                  <Select value={data.commandType} onValueChange={data.onCommandChange}>
                    <SelectTrigger className="nodrag nopan w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{data.commandOptions.map((command) => <SelectItem key={command.type} value={command.type}>{command.type}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <p className="text-sm text-muted-foreground">Este dispositivo não declarou comandos.</p>}
              </div>
            ) : null}
            {data.commandType && Object.keys(data.parametersSchema).length > 0 ? (
              <div className="nodrag nopan rounded-md border border-input bg-background p-2">
                <ParametersForm idPrefix="action-node" schema={data.parametersSchema} values={data.parametersValues} onChange={(values) => data.onParametersChange?.(values)} />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm"><span className="font-medium">{data.deviceId}</span> <span className="text-muted-foreground">·</span> {data.commandType}</p>
              <TriggerButton onTrigger={data.onTrigger} title="Disparar ação agora" />
            </div>
            <pre className="overflow-x-auto rounded-md border border-input bg-background p-2 font-mono text-xs">{data.parametersJson}</pre>
          </>
        )}
      </div>
      <Handle type="target" position={Position.Left} isConnectable={false} />
    </div>
  );
}
