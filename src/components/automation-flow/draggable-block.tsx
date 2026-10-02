import { setBlockDragPayload, type BlockDragPayload } from "./use-block-drop-target";

// DraggableBlock is the one visual "chip" block-sidebar.tsx is made of -
// a device or a comparação/E/OU/NÃO block. Dropping it always applies to
// whatever's currently selected on the canvas - see
// use-block-drop-target.ts's doc comment.
export function DraggableBlock({ label, payload, title, disabled = false }: { label: string; payload: BlockDragPayload; title?: string; disabled?: boolean }) {
  return (
    <div
      draggable={!disabled}
      onDragStart={disabled ? undefined : (event) => setBlockDragPayload(event, payload)}
      title={title}
      aria-disabled={disabled}
      className={"w-fit select-none rounded-md border border-border bg-card px-2.5 py-1.5 text-sm shadow-sm " + (disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing")}
    >
      {label}
    </div>
  );
}
