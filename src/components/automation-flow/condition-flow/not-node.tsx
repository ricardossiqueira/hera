import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NotNodeData extends Record<string, unknown> {
  mode: "create" | "edit" | "read_only";
  // See event-node.tsx's doc comment on isSelected.
  isSelected?: boolean;
  // Visual hint only (see combinator-node.tsx's doc comment) - not has a
  // hard 1-child cap; addChild already safely no-ops once it's filled.
  hasChild: boolean;
  onDelete?: () => void;
}

export type NotFlowNode = Node<NotNodeData, "not">;

// NotNode always has at most one child, filled by dropping a block from
// the sidebar onto it (see combinator-node.tsx's doc comment - the same
// applies here: no more drag-from-handle creation).
export function NotNode({ data }: NodeProps<NotFlowNode>) {
  const droppable = data.mode !== "read_only" && !data.hasChild;
  return (
    <div
      className={
        "nodrag nopan flex items-center gap-1 rounded-full border border-dashed bg-card px-3 py-1.5 text-sm font-medium text-card-foreground shadow-sm " +
        (data.isSelected ? "border-primary ring-2 ring-primary/30" : droppable ? "border-primary/50" : "border-border")
      }
      title={droppable ? "Solte um bloco de condição aqui para escolher o que negar" : undefined}
    >
      <span>NÃO</span>
      <Button type="button" size="icon-xs" variant="ghost" aria-label="Remover NÃO" disabled={data.mode === "read_only"} onClick={() => data.onDelete?.()}>
        <Trash2 />
      </Button>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
