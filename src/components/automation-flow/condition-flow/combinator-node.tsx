import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CombinatorNodeData extends Record<string, unknown> {
  mode: "create" | "detail";
  // See event-node.tsx's doc comment on isSelected.
  isSelected?: boolean;
  kind: "and" | "or";
  // Not a handle gate any more (see the module doc comment) - just a
  // visual hint for whether a block dropped from the sidebar onto this
  // node would actually do anything (mutations.ts's addChild safely
  // no-ops past MAX_DEPTH regardless, so this is UX only).
  canAddChild: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
}

export type CombinatorFlowNode = Node<CombinatorNodeData, "combinator">;

// CombinatorNode is E/OU - both share this component (only the label and
// the onToggle target differ). Its default (unnamed) source handle
// carries every real edge to a current child (drawn by layout.ts, not
// user-draggable) and, when this node is the tree's root, rule-canvas.tsx's
// fixed pipeline edge to Ação. Children are added by selecting this node
// and dropping a block from block-sidebar.tsx onto the canvas (see
// rule-canvas.tsx's canAcceptConditionBlock / use-condition-flow.ts's
// handleDrop), so this node has no interactive handle at all any more -
// only the structural target/source pair every
// condition-flow node type carries.
export function CombinatorNode({ data }: NodeProps<CombinatorFlowNode>) {
  const label = data.kind === "and" ? "E" : "OU";
  const droppable = data.mode === "create" && data.canAddChild;
  return (
    <div
      className={
        "nodrag nopan flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground shadow-sm " +
        (data.isSelected ? "border-primary ring-2 ring-primary/30 " : droppable ? "border-dashed border-primary/50 " : "border-border ")
      }
      title={droppable ? "Solte um bloco de condição aqui para adicionar" : undefined}
    >
      {data.mode === "create" ? (
        <button
          type="button"
          className="underline decoration-dotted underline-offset-2"
          title="Alternar E/OU"
          onClick={() => data.onToggle?.()}
        >
          {label}
        </button>
      ) : (
        <span>{label}</span>
      )}
      {data.mode === "create" ? (
        <Button type="button" size="icon-xs" variant="ghost" aria-label="Remover grupo" onClick={() => data.onDelete?.()}>
          <Trash2 />
        </Button>
      ) : null}
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
