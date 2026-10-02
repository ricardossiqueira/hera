import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type EventOutputChannel = "telemetry" | "state" | "event" | "command-result";

export interface EventNodeData extends Record<string, unknown> {
  mode: "create" | "edit" | "read_only";
  isSelected?: boolean;
  deviceId: string;
  eventType: string;
  eventTypeOptions: string[];
  // V1 rules have no channel concept - always "event" under the hood - so
  // these stay optional and the node simply omits the Canal box when the
  // caller (new.tsx, V2) doesn't pass outputChannelOptions.
  outputChannel?: EventOutputChannel | "";
  outputChannelOptions?: EventOutputChannel[];
  ignoreRetained?: boolean;
  onDeviceChange?: (deviceId: string) => void;
  onEventTypeChange?: (eventType: string) => void;
  onOutputChannelChange?: (channel: EventOutputChannel) => void;
  onIgnoreRetainedChange?: (value: boolean) => void;
}

export type EventFlowNode = Node<EventNodeData, "event">;

const CHANNEL_LABELS: Record<EventOutputChannel, string> = { telemetry: "Telemetria", state: "Estado", event: "Evento", "command-result": "Resultado de comando" };

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
      {data.outputChannelOptions?.length ? <div className="rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Canal</p>
        <p className="mt-1">{data.outputChannel ? CHANNEL_LABELS[data.outputChannel] : "Arraste um canal"}</p>
      </div> : null}
      {!data.outputChannelOptions || data.outputChannel === "event" ? <div className="rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Evento</p>
        <p className="mt-1">{data.eventType || "Arraste um evento"}</p>
      </div> : null}
      {data.outputChannel === "state" ? <div className="rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Ignorar retained</p>
        <p className="mt-1">{data.ignoreRetained === undefined ? "Arraste ON/OFF" : data.ignoreRetained ? "ON" : "OFF"}</p>
      </div> : null}
    </div>
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </div>;
}
