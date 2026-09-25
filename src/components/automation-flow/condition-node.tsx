import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ConditionBuilder } from "@/components/condition-builder";

export interface ConditionNodeData extends Record<string, unknown> {
  mode: "create" | "detail";
  conditionJson: string;
  fieldSuggestions: string[];
  onChange?: (json: string) => void;
}

export type ConditionFlowNode = Node<ConditionNodeData, "condition">;

// ConditionNode is the middle node - see event-node.tsx's doc comment for
// why its handles are present but isConnectable={false}.
export function ConditionNode({ data }: NodeProps<ConditionFlowNode>) {
  return (
    <div className="w-80 rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="border-b border-border px-3 py-2 text-sm font-medium">Condição</div>
      <div className="nodrag nopan p-3">
        {data.mode === "create" ? (
          <ConditionBuilder value={data.conditionJson} onChange={(json) => data.onChange?.(json)} fieldSuggestions={data.fieldSuggestions} />
        ) : data.conditionJson ? (
          <pre className="overflow-x-auto rounded-md border border-input bg-background p-2 font-mono text-xs">{data.conditionJson}</pre>
        ) : (
          <p className="text-sm text-muted-foreground">Sem condição — dispara sempre que o evento acontecer.</p>
        )}
      </div>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
