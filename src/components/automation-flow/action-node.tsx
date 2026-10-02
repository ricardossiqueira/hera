import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CommandDescriptor } from "@/api/gateway";
import type { ParameterSchema } from "@/components/parameters-form";

export interface ActionNodeData extends Record<string, unknown> {
  mode: "create" | "edit" | "read_only";
  isSelected?: boolean;
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

// The action is a construction block, not a mini-form. Its settings belong
// to the sidebar selected for this node.
export function ActionNode({ data }: NodeProps<ActionFlowNode>) {
  const parameterCount = Object.keys(data.parametersSchema).length;
  return <div className={"w-52 rounded-lg border bg-card text-card-foreground shadow-sm " + (data.isSelected ? "border-primary ring-2 ring-primary/30" : "border-border")}>
    <div className="border-b border-border px-3 py-2 text-sm font-medium">Ação</div>
    <div className="space-y-2 p-3 text-sm">
      <div className="rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Destino</p>
        <p className="mt-1 font-medium">{data.deviceId || "Arraste um dispositivo"}</p>
      </div>
      <div className="rounded-md border border-dashed border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Comando</p>
        <p className="mt-1">{data.commandType || "Arraste um comando"}</p>
        {parameterCount ? <div className="mt-2 space-y-1.5">{Object.entries(data.parametersSchema).map(([name, field]) => {
          const rawValue = data.parametersValues[name];
          const value = field.type === "boolean" ? rawValue === true ? "ON" : rawValue === false ? "OFF" : "Não definido" : typeof rawValue === "string" && rawValue ? rawValue : "Não definido";
          return <div key={name} className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-xs">
            <span className="text-muted-foreground">{name}</span><span className="font-medium">{value}</span>
          </div>;
        })}</div> : null}
      </div>
    </div>
    <Handle type="target" position={Position.Left} isConnectable={false} />
  </div>;
}
