import { DraggableBlock } from "@/components/automation-flow/draggable-block";
import type { AddableKind } from "@/components/automation-flow/condition-flow/mutations";
import { useGateway } from "@/context/gateway-context";

const CONDITION_BLOCKS: { kind: AddableKind; label: string }[] = [
  { kind: "comparison", label: "Comparação" },
  { kind: "and", label: "E" },
  { kind: "or", label: "OU" },
  { kind: "not", label: "NÃO" },
];

// BlockSidebar shows only the blocks relevant to whatever is currently
// selected on the canvas - see rule-canvas.tsx's showDevices/
// showConditionBlocks, computed from the selected node's role (Evento/
// Ação accept devices; a combinator/not that still has room accepts
// condition blocks; a comparison leaf or a full not accepts nothing).
// Dropping a block always applies to the selected node, wherever on the
// canvas it's released - see use-block-drop-target.ts's doc comment.
export function BlockSidebar({ showDevices, showConditionBlocks }: { showDevices: boolean; showConditionBlocks: boolean }) {
  const { devices } = useGateway();
  const deviceList = (devices.data ?? []).filter((device) => device.enabled && (device.topics?.event || device.topics?.command));

  if (!showDevices && !showConditionBlocks) {
    return (
      <aside className="w-48 shrink-0 rounded-lg border border-dashed border-border p-3">
        <p className="text-xs text-muted-foreground">Selecione um bloco no canvas para ver o que pode arrastar para ele.</p>
      </aside>
    );
  }

  return (
    <aside className="w-48 shrink-0 space-y-4 overflow-y-auto rounded-lg border border-border p-3">
      {showDevices ? (
        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Dispositivos</h3>
          <div className="space-y-1.5">
            {deviceList.map((device) => (
              <DraggableBlock
                key={device.id}
                label={device.id}
                payload={{ kind: "device", deviceId: device.id, supportsEvent: Boolean(device.topics?.event), supportsCommand: Boolean(device.topics?.command) }}
                title="Arraste para o bloco selecionado"
              />
            ))}
            {deviceList.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum dispositivo habilitado.</p> : null}
          </div>
        </section>
      ) : null}
      {showConditionBlocks ? (
        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Condição</h3>
          <div className="flex flex-wrap gap-1.5">
            {CONDITION_BLOCKS.map((block) => (
              <DraggableBlock key={block.kind} label={block.label} payload={{ kind: block.kind }} title="Arraste para o bloco selecionado" />
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
