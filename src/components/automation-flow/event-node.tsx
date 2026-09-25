import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Device } from "@/api/gateway";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface EventNodeData extends Record<string, unknown> {
  mode: "create" | "detail";
  devices: Device[];
  deviceId: string;
  eventType: string;
  eventTypeOptions: string[];
  onDeviceChange?: (deviceId: string) => void;
  onEventTypeChange?: (eventType: string) => void;
}

export type EventFlowNode = Node<EventNodeData, "event">;

// EventNode is the first of three fixed nodes in a single automation
// rule's canvas (event -> condition -> action, one canvas per rule - see
// src/pages/automations/{new,detail}.tsx). Its Handle exists only so the
// two structural edges have somewhere to visually attach; isConnectable
// is false because this pipeline's shape never changes by dragging - the
// canvas IS the rule, there's no second rule to connect to.
export function EventNode({ data }: NodeProps<EventFlowNode>) {
  return (
    <div className="w-72 rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="border-b border-border px-3 py-2 text-sm font-medium">Evento</div>
      <div className="nodrag nopan space-y-2 p-3">
        {data.mode === "create" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Dispositivo de origem</Label>
              <Select value={data.deviceId} onValueChange={data.onDeviceChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{data.devices.map((device) => <SelectItem key={device.id} value={device.id}>{device.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo de evento</Label>
              <Input
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
          <p className="text-sm"><span className="font-medium">{data.deviceId}</span> <span className="text-muted-foreground">·</span> {data.eventType}</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
