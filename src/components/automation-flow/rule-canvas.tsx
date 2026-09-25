import { Background, Controls, MarkerType, ReactFlow, ReactFlowProvider, useNodesState, type Edge } from "@xyflow/react";
import { ActionNode, type ActionFlowNode, type ActionNodeData } from "@/components/automation-flow/action-node";
import { ConditionNode, type ConditionFlowNode, type ConditionNodeData } from "@/components/automation-flow/condition-node";
import { EventNode, type EventFlowNode, type EventNodeData } from "@/components/automation-flow/event-node";

const nodeTypes = { event: EventNode, condition: ConditionNode, action: ActionNode };

export const EVENT_NODE_ID = "event";
export const CONDITION_NODE_ID = "condition";
export const ACTION_NODE_ID = "action";

// Fixed layout, fixed edges: a rule's canvas always has exactly these
// three nodes in this order - there is nothing to connect (the pipeline
// IS the rule) and nothing to lay out dynamically, unlike the old
// shared device-graph canvas this replaces.
const initialNodes = [
  { id: EVENT_NODE_ID, type: "event" as const, position: { x: 0, y: 40 }, data: {} as EventNodeData },
  { id: CONDITION_NODE_ID, type: "condition" as const, position: { x: 340, y: 0 }, data: {} as ConditionNodeData },
  { id: ACTION_NODE_ID, type: "action" as const, position: { x: 740, y: 0 }, data: {} as ActionNodeData },
];

const fixedEdges: Edge[] = [
  { id: "event-condition", source: EVENT_NODE_ID, target: CONDITION_NODE_ID, deletable: false, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "condition-action", source: CONDITION_NODE_ID, target: ACTION_NODE_ID, deletable: false, markerEnd: { type: MarkerType.ArrowClosed } },
];

// RuleCanvas renders one automation rule as a fixed 3-node pipeline
// (event -> condition -> action), used by both new.tsx (mode: "create")
// and detail.tsx (mode: "detail") - see the plan this was built from for
// why the old shared canvas (one node per device, edges for every rule)
// doesn't scale and got replaced by one canvas per rule.
//
// Fixes the old canvas's reset bug at the root: node *position* lives
// only in useNodesState, touched only by dragging (onNodesChange) - it
// is never rebuilt from the caller's data. Fresh eventData/
// conditionData/actionData (the caller's form state, which changes on
// every keystroke) are merged onto the current positions on every
// render instead of replacing the nodes wholesale, so nothing the
// operator dragged ever snaps back.
export function RuleCanvas({ eventData, conditionData, actionData }: {
  eventData: EventNodeData;
  conditionData: ConditionNodeData;
  actionData: ActionNodeData;
}) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  // Rebuilt from `nodes` (by index - initialNodes' order is fixed: event,
  // condition, action) with fresh data merged in, never from `nodes`'
  // stale data. Each element spreads the *whole* real node (position,
  // plus whatever React Flow itself attached - `measured`, `dragging`,
  // `selected`) and only overrides `data`. Reconstructing a bare
  // {id, type, position, data} here instead (as an earlier version did)
  // silently dropped `measured` on every render; since fitView only runs
  // once on mount and needs measured dimensions to compute a sane
  // viewport, that left the canvas fit against zero-size nodes - a
  // blank canvas with no console error. The cast is safe: index 0 is
  // always the event node, etc. (TypeScript can't narrow that through
  // array indexing on a 3-member union on its own).
  const displayNodes = [
    { ...(nodes[0] as EventFlowNode), data: eventData },
    { ...(nodes[1] as ConditionFlowNode), data: conditionData },
    { ...(nodes[2] as ActionFlowNode), data: actionData },
  ];

  return (
    <div className="h-[70vh] overflow-hidden rounded-lg border border-border">
      <ReactFlowProvider>
        <ReactFlow nodes={displayNodes} edges={fixedEdges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
