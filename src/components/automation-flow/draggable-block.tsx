import { setBlockDragPayload, type BlockDragPayload } from "./use-block-drop-target";

// DraggableBlock is the one visual "chip" block-sidebar.tsx is made of -
// a device or a comparação/E/OU/NÃO block. Dropping it always applies to
// whatever's currently selected on the canvas - see
// use-block-drop-target.ts's doc comment.
export function DraggableBlock({ label, payload, title }: { label: string; payload: BlockDragPayload; title?: string }) {
  return (
    <div
      draggable
      onDragStart={(event) => setBlockDragPayload(event, payload)}
      title={title}
      className="w-fit cursor-grab select-none rounded-md border border-border bg-card px-2.5 py-1.5 text-sm shadow-sm active:cursor-grabbing"
    >
      {label}
    </div>
  );
}
