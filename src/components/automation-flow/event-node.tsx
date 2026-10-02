import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export interface EventNodeData extends Record<string, unknown> {
  mode: "create" | "edit" | "read_only";
  isSelected?: boolean;
  deviceId: string;
  eventType: string;
  eventTypeOptions: string[];
  onDeviceChange?: (deviceId: string) => void;
  onEventTypeChange?: (eventType: string) => void;
}

export type EventFlowNode = Node<EventNodeData, "event">;

// A canvas node intentionally contains no editable control. Selecting it
// exposes its configuration in BlockSidebar, leaving the canvas as a clean
// composition surface that can be freely repositioned.
export function EventNode({ data }: NodeProps<EventFlowNode>) {
  return <div className={"w-52 rounded-lg border bg-card text-card-foreground shadow-sm " + (data.isSelected ? "border-primary ring-2 ring-primary/30" : "border-border")}>
    <div className="border-b border-border px-3 py-2 text-sm font-medium">Evento</div>
    <div className="space-y-2 p-3 text-sm">
      <div className="rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Origem</p>
        <p className="mt-1 font-medium">{data.deviceId || "Arraste um dispositivo"}</p>
      </div>
      <div className="rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Evento</p>
        <p className="mt-1">{data.eventType || "Arraste um evento"}</p>
      </div>
    </div>
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </div>;
}
