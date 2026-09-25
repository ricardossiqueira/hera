import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { TriggerButton } from "@/components/automation-flow/trigger-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EventNodeData extends Record<string, unknown> {
  mode: "create" | "detail";
  // Whether this node is the block currently selected on the canvas -
  // computed by rule-canvas.tsx from its own onNodeClick-tracked state,
  // not from React Flow's built-in `.selected`. See this node's doc
  // comment below for why.
  isSelected?: boolean;
  deviceId: string;
  eventType: string;
  eventTypeOptions: string[];
  // Called by rule-canvas.tsx when a device block dropped while this
  // node is selected (or with "" to clear) - device selection is
  // drag-and-drop now, not a <Select>, see this node's doc comment below.
  onDeviceChange?: (deviceId: string) => void;
  onEventTypeChange?: (eventType: string) => void;
  // Detail mode only: fires this rule's action for real, same as
  // ActionNode's own trigger - see trigger-button.tsx's doc comment. Both
  // nodes call the exact same rule action; this one just gives the
  // operator a shortcut from the "cause" side of the pipeline too.
  onTrigger?: () => Promise<void>;
}

export type EventFlowNode = Node<EventNodeData, "event">;

// EventNode is one of the two always-present nodes on a rule's canvas
// (Evento, Ação, plus the condition tree in between once one exists - see
// src/pages/automations/{new,detail}.tsx / rule-canvas.tsx). Its device
// field is a drop target, not a <Select>: rule-canvas.tsx applies
// whatever device block is dropped while this node is *selected*
// (block-sidebar.tsx / use-block-drop-target.ts - selection decides the
// target, not drop position) - this component only renders the result,
// it has no drop handler of its own. The handle is purely structural
// again (isConnectable={false}, same reasoning as the very first version
// of this pipeline): with the condition editor back inline instead of a
// popup, there's nothing left for a manual connect gesture to trigger.
//
// nodrag/nopan sit on the individual interactive controls (the <Input>,
// the remove button), not on the whole body, so blank areas of the node
// stay clickable (nodrag blocks whatever gesture starts on it, wherever
// applied). Selection highlighting comes from data.isSelected, not React
// Flow's own `.selected` class - see rule-canvas.tsx's doc comment on
// displayNodes for why relying on React Flow's built-in selection state
// while also passing controlled `nodes` on every render turned out to be
// a losing race.
export function EventNode({ data }: NodeProps<EventFlowNode>) {
  return (
    <div className={"w-72 rounded-lg border bg-card text-card-foreground shadow-sm " + (data.isSelected ? "border-primary ring-2 ring-primary/30" : "border-border")}>
      <div className="border-b border-border px-3 py-2 text-sm font-medium">Evento</div>
      <div className="space-y-2 p-3">
        {data.mode === "create" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Dispositivo de origem</Label>
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
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo de evento</Label>
              <Input
                className="nodrag nopan"
                list="event-node-type-options"
                value={data.eventType}
                onChange={(event) => data.onEventTypeChange?.(event.target.value)}
                placeholder="button_pressed"
                disabled={!data.deviceId}
              />
              {data.eventTypeOptions.length ? (
                <datalist id="event-node-type-options">{data.eventTypeOptions.map((type) => <option key={type} value={type} />)}</datalist>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm"><span className="font-medium">{data.deviceId}</span> <span className="text-muted-foreground">·</span> {data.eventType}</p>
            <TriggerButton onTrigger={data.onTrigger} title="Disparar ação agora" />
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
