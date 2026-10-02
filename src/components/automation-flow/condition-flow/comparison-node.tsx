import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Operator, ValueType } from "@/components/automation-flow/condition-flow/types";

export interface ComparisonNodeData extends Record<string, unknown> {
  mode: "create" | "edit" | "read_only";
  isSelected?: boolean;
  field: string;
  operator: Operator;
  type: ValueType;
  value: string;
  fieldSuggestions: string[];
  onChange?: (patch: Partial<{ field: string; operator: Operator; type: ValueType; value: string }>) => void;
  onDelete?: () => void;
}

export type ComparisonFlowNode = Node<ComparisonNodeData, "comparison">;

export function ComparisonNode({ data }: NodeProps<ComparisonFlowNode>) {
  const value = data.type === "string" ? `"${data.value}"` : data.value;
  return <div className={"w-80 rounded-lg border bg-card p-3 text-card-foreground shadow-sm " + (data.isSelected ? "border-primary ring-2 ring-primary/30" : "border-border")}>
    <p className="mb-2 text-xs font-medium text-muted-foreground">Comparação</p>
    <div className="space-y-2 text-sm">
      <div className="min-w-0 rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Condição</p>
        <p className="mt-1 truncate font-medium">{data.field || "Arraste um campo"}</p>
      </div>
      <div className="rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Operador</p>
        <p className="mt-1 font-mono font-medium">{data.operator || "—"}</p>
      </div>
      <div className="min-w-0 rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Valor</p>
        <p className="mt-1 truncate font-medium">{value || "Defina o valor"}</p>
      </div>
    </div>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <Handle type="source" position={Position.Right} isConnectable={false} style={{ visibility: "hidden" }} />
  </div>;
}
