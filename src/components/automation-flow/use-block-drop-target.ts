import { useCallback } from "react";
import type { AddableKind } from "./condition-flow/mutations";

// The MIME type every draggable block (draggable-block.tsx) writes its
// payload under, and every drop target reads it back from.
const BLOCK_DRAG_MIME = "application/x-automation-block";

// supportsEvent/supportsCommand travel with the drag itself (set by
// block-sidebar.tsx from the device's own topics) so the drop handler in
// rule-canvas.tsx can reject an invalid role - a device dropped on Ação
// without a command topic, say - without needing the full Device list
// threaded down to it separately.
export type DeviceBlockPayload = { kind: "device"; deviceId: string; supportsEvent: boolean; supportsCommand: boolean };
export type ConditionBlockPayload = { kind: AddableKind };
export type BlockDragPayload = DeviceBlockPayload | ConditionBlockPayload;

export function setBlockDragPayload(event: React.DragEvent, payload: BlockDragPayload): void {
  event.dataTransfer.setData(BLOCK_DRAG_MIME, JSON.stringify(payload));
  event.dataTransfer.effectAllowed = "copy";
}

// useBlockDropTarget wires the canvas wrapper to accept a block dragged
// from block-sidebar.tsx. The drop always applies to whatever node is
// currently selected on the canvas - not to wherever the cursor happens
// to release - so, unlike an earlier version of this hook, there's no
// screenToFlowPosition/getIntersectingNodes hit-testing here at all: the
// sidebar's own candidate list is already filtered by the selection (see
// rule-canvas.tsx), so by the time a drop lands, "which block does this
// go into" was decided at selection time, not at drop time.
export function useBlockDropTarget<T>(options: {
  parsePayload: (raw: string) => T | null;
  onDrop: (payload: T) => void;
}) {
  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(BLOCK_DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    const raw = event.dataTransfer.getData(BLOCK_DRAG_MIME);
    if (!raw) return;
    event.preventDefault();
    const payload = options.parsePayload(raw);
    if (payload) options.onDrop(payload);
  }, [options]);

  return { onDragOver, onDrop };
}
