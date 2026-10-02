import { useCallback, useMemo, useState } from "react";
import { useUpdateNodeInternals, type XYPosition } from "@xyflow/react";
import { layoutConditionTree, type ConditionFlowCallbacks, type ConditionLayout } from "./layout";
import { addChild, deleteNode, toggleCombinator, updateLeaf, type AddableKind } from "./mutations";
import { parseCondition, serializeCondition } from "./serialize";
import type { ConditionTree } from "./types";

export interface UseConditionFlowArgs {
  mode: "create" | "edit" | "read_only";
  conditionJson: string;
  fieldSuggestions: string[];
  anchor: XYPosition;
  onChange?: (json: string) => void;
}

export interface UseConditionFlowResult extends ConditionLayout {
  // Called by rule-canvas.tsx's drop handler with the dragged block's
  // kind and the resolved target node id (rule-canvas.tsx's
  // resolveConditionTarget - selection-based, not a drop-position
  // hit-test; null means no valid target and this is a no-op). Also
  // safe to call with a targetNodeId that can't actually accept a child
  // (a comparison leaf, a full not, MAX_DEPTH) - addChild itself no-ops.
  handleDrop: (kind: AddableKind, targetNodeId: string | null) => void;
}

// useConditionFlow owns the ConditionTree as real React state, parsed from
// conditionJson only once on mount (see types.ts's doc comment on why node
// ids must stay stable across edits: re-deriving the tree from
// parse(serialize(tree)) on every change would hand each leaf a fresh id
// whenever its value field changes, and React Flow would remount that
// leaf's <Input> mid-keystroke, dropping focus). Every mutation updates
// this state directly and pushes the new serialized JSON out via
// onChange - conditionJson itself is never read again after mount. In
// "detail" mode nothing is mutable, so this just parses+lays out once.
export function useConditionFlow({ mode, conditionJson, fieldSuggestions, anchor, onChange }: UseConditionFlowArgs): UseConditionFlowResult {
  const [tree, setTree] = useState<ConditionTree>(() => parseCondition(conditionJson));
  const updateNodeInternals = useUpdateNodeInternals();

  const mutate = useCallback((next: ConditionTree, changedHandleNodeIds: string[]) => {
    if (mode === "read_only") return;
    setTree(next);
    onChange?.(serializeCondition(next));
    // Handle sets don't change dynamically any more (every condition-flow
    // node type has a fixed target+source pair - see combinator-node.tsx's
    // doc comment), so this is mostly a no-op safety net now rather than
    // the load-bearing fix it was when nodes had a conditional "add"
    // handle; harmless either way, including for an id that no longer
    // exists (e.g. the tree's own placeholder-less empty-root id).
    for (const id of changedHandleNodeIds) updateNodeInternals(id);
  }, [mode, onChange, updateNodeInternals]);

  const callbacks: ConditionFlowCallbacks = useMemo(() => ({
    onUpdateLeaf: (id, patch) => mutate(updateLeaf(tree, id, patch), []),
    onToggleCombinator: (id) => mutate(toggleCombinator(tree, id), [id]),
    onDelete: (id) => mutate(deleteNode(tree, id), [id]),
  }), [tree, mutate]);

  const handleDrop = useCallback((kind: AddableKind, targetNodeId: string | null) => {
    const parentId = targetNodeId ?? (tree.kind === "empty" ? tree.id : null);
    if (!parentId) return; // dropped on empty canvas, but a root already exists - a condition is one tree, not a forest
    mutate(addChild(tree, parentId, kind), [parentId]);
  }, [tree, mutate]);

  const layout = useMemo(
    () => layoutConditionTree(tree, anchor, mode, fieldSuggestions, callbacks),
    [tree, anchor, mode, fieldSuggestions, callbacks],
  );

  return { ...layout, handleDrop };
}
