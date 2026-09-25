import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CommandDescriptor, Device } from "@/api/gateway";
import { type ParameterSchema, ParametersForm } from "@/components/parameters-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ActionNodeData extends Record<string, unknown> {
  mode: "create" | "detail";
  devices: Device[];
  deviceId: string;
  commandType: string;
  commandOptions: CommandDescriptor[];
  parametersSchema: ParameterSchema;
  parametersValues: Record<string, string | boolean>;
  parametersJson: string;
  onDeviceChange?: (deviceId: string) => void;
  onCommandChange?: (commandType: string) => void;
  onParametersChange?: (values: Record<string, string | boolean>) => void;
}

export type ActionFlowNode = Node<ActionNodeData, "action">;

// ActionNode is the last node - see event-node.tsx's doc comment for why
// its handle is present but isConnectable={false}.
export function ActionNode({ data }: NodeProps<ActionFlowNode>) {
  return (
    <div className="w-80 rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="border-b border-border px-3 py-2 text-sm font-medium">Ação</div>
      <div className="nodrag nopan space-y-2 p-3">
        {data.mode === "create" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Dispositivo de ação</Label>
              <Select value={data.deviceId} onValueChange={data.onDeviceChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{data.devices.map((device) => <SelectItem key={device.id} value={device.id}>{device.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {data.deviceId ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Comando</Label>
                {data.commandOptions.length ? (
                  <Select value={data.commandType} onValueChange={data.onCommandChange}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{data.commandOptions.map((command) => <SelectItem key={command.type} value={command.type}>{command.type}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <p className="text-sm text-muted-foreground">Este dispositivo não declarou comandos.</p>}
              </div>
            ) : null}
            {data.commandType && Object.keys(data.parametersSchema).length > 0 ? (
              <div className="rounded-md border border-input bg-background p-2">
                <ParametersForm idPrefix="action-node" schema={data.parametersSchema} values={data.parametersValues} onChange={(values) => data.onParametersChange?.(values)} />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm"><span className="font-medium">{data.deviceId}</span> <span className="text-muted-foreground">·</span> {data.commandType}</p>
            <pre className="overflow-x-auto rounded-md border border-input bg-background p-2 font-mono text-xs">{data.parametersJson}</pre>
          </>
        )}
      </div>
      <Handle type="target" position={Position.Left} isConnectable={false} />
    </div>
  );
}
