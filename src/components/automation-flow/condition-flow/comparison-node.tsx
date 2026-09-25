import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OPERATORS, type Operator, type ValueType } from "@/components/automation-flow/condition-flow/types";

export interface ComparisonNodeData extends Record<string, unknown> {
  mode: "create" | "detail";
  // See event-node.tsx's doc comment on isSelected - condition-flow nodes
  // are draggable:false (layout.ts), which sidesteps the click/selection
  // race that motivated isSelected for Evento/Ação, but rule-canvas.tsx
  // computes selection the same way for every node type uniformly.
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

// ComparisonNode is a leaf: it never has children, so unlike combinator/not
// it has no "add" handle - only a target (to receive its parent's edge)
// and a hidden "out", present only so the fixed root->Ação pipeline edge
// has somewhere to attach when a bare comparison is the whole condition.
export function ComparisonNode({ id, data }: NodeProps<ComparisonFlowNode>) {
  const datalistId = `condition-flow-fields-${id}`;

  const borderClass = data.isSelected ? "border-primary ring-2 ring-primary/30" : "border-border";

  if (data.mode === "detail") {
    return (
      <div className={"w-56 rounded-lg border bg-card p-2 text-xs text-card-foreground shadow-sm " + borderClass}>
        <span className="font-medium">{data.field}</span> {data.operator}{" "}
        {data.type === "string" ? `"${data.value}"` : data.value}
        <Handle type="target" position={Position.Left} isConnectable={false} />
        {/* Same hidden default source handle the create-mode render has
            below - without it, a rule whose condition is a bare
            comparison (no and/or/not wrapper) has no handle for the
            fixed root->Ação edge to attach to in detail view, which is
            exactly what produced React Flow's error #008. */}
        <Handle type="source" position={Position.Right} isConnectable={false} style={{ visibility: "hidden" }} />
      </div>
    );
  }

  return (
    <div className={"nodrag nopan w-56 space-y-1.5 rounded-lg border bg-card p-2 text-card-foreground shadow-sm " + borderClass}>
      {data.fieldSuggestions.length ? (
        <datalist id={datalistId}>{data.fieldSuggestions.map((field) => <option key={field} value={field} />)}</datalist>
      ) : null}
      <div className="flex items-center gap-1">
        <Input
          list={datalistId}
          className="h-7 flex-1 text-xs"
          placeholder="campo"
          value={data.field}
          onChange={(event) => data.onChange?.({ field: event.target.value })}
        />
        <Button type="button" size="icon-xs" variant="ghost" aria-label="Remover condição" onClick={() => data.onDelete?.()}>
          <Trash2 />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Select value={data.operator} onValueChange={(op) => data.onChange?.({ operator: op as Operator })}>
          <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{OPERATORS.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
        </Select>
        <Select
          value={data.type}
          onValueChange={(type) => {
            // Same fix as the old condition-builder.tsx: switching to
            // boolean must set a real value immediately, not just display
            // one via the <Select>'s own fallback, or it silently
            // serializes as false until the operator is reopened.
            const value = type === "boolean" && data.value !== "true" && data.value !== "false" ? "true" : data.value;
            data.onChange?.({ type: type as ValueType, value });
          }}
        >
          <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="string">texto</SelectItem>
            <SelectItem value="number">número</SelectItem>
            <SelectItem value="boolean">booleano</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {data.type === "boolean" ? (
        <Select value={data.value === "false" ? "false" : "true"} onValueChange={(next) => data.onChange?.({ value: next })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="true">true</SelectItem><SelectItem value="false">false</SelectItem></SelectContent>
        </Select>
      ) : (
        <Input
          className="h-7 text-xs"
          type={data.type === "number" ? "number" : "text"}
          placeholder="valor"
          value={data.value}
          onChange={(event) => data.onChange?.({ value: event.target.value })}
        />
      )}
      <Handle type="target" position={Position.Left} isConnectable={false} />
      {/* Default (unnamed) source handle, used only when this leaf is the
          whole tree - see combinator-node.tsx's doc comment for why it's
          left unnamed rather than given an "out" id. */}
      <Handle type="source" position={Position.Right} isConnectable={false} style={{ visibility: "hidden" }} />
    </div>
  );
}
