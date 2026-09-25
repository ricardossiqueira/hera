import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Background, Controls, MarkerType, ReactFlow, ReactFlowProvider, useNodesInitialized, useNodesState, useReactFlow, type Edge, type XYPosition } from "@xyflow/react";
import { toast } from "sonner";
import { ActionNode, type ActionFlowNode, type ActionNodeData } from "@/components/automation-flow/action-node";
import { BlockSidebar } from "@/components/automation-flow/block-sidebar";
import { CombinatorNode } from "@/components/automation-flow/condition-flow/combinator-node";
import { ComparisonNode } from "@/components/automation-flow/condition-flow/comparison-node";
import type { ConditionFlowNode } from "@/components/automation-flow/condition-flow/layout";
import { NotNode } from "@/components/automation-flow/condition-flow/not-node";
import type { ConditionNodeData } from "@/components/automation-flow/condition-flow/types";
import { useConditionFlow, type UseConditionFlowResult } from "@/components/automation-flow/condition-flow/use-condition-flow";
import { EventNode, type EventFlowNode, type EventNodeData } from "@/components/automation-flow/event-node";
import { useBlockDropTarget, type BlockDragPayload } from "@/components/automation-flow/use-block-drop-target";

const nodeTypes = {
  event: EventNode, action: ActionNode,
  comparison: ComparisonNode, combinator: CombinatorNode, not: NotNode,
};

export const EVENT_NODE_ID = "event";
export const ACTION_NODE_ID = "action";

// The condition tree is anchored where a standalone "Condição" block used
// to sit; ACTION_GAP is the breathing room kept between the tree's
// measured right edge (condition-flow/layout.ts's `width`) and Ação.
const CONDITION_ANCHOR: XYPosition = { x: 340, y: 0 };
const ACTION_GAP = 60;

const initialNodes = [
  { id: EVENT_NODE_ID, type: "event" as const, position: { x: 0, y: 40 }, data: {} as EventNodeData },
  { id: ACTION_NODE_ID, type: "action" as const, position: { x: CONDITION_ANCHOR.x + 300, y: 0 }, data: {} as ActionNodeData },
];

type CanvasNode = EventFlowNode | ActionFlowNode | ConditionFlowNode;

interface RuleCanvasProps {
  eventData: EventNodeData;
  conditionData: ConditionNodeData;
  actionData: ActionNodeData;
}

// canAcceptConditionBlock decides whether the currently selected node
// would do anything sensible with a dropped Comparação/E/OU/NÃO block:
// Evento/Ação only while the tree is still empty (that drop becomes the
// root - see use-condition-flow.ts's handleDrop), a combinator only below
// MAX_DEPTH, a "not" only while still childless. Reuses the canAddChild/
// hasChild each node's own data already carries (condition-flow/layout.ts)
// rather than recomputing depth here.
function canAcceptConditionBlock(selectedId: string | null, condition: UseConditionFlowResult): boolean {
  if (selectedId === EVENT_NODE_ID || selectedId === ACTION_NODE_ID) return condition.nodes.length === 0;
  const node = condition.nodes.find((candidate) => candidate.id === selectedId);
  if (!node) return false;
  if (node.type === "combinator") return node.data.canAddChild;
  if (node.type === "not") return !node.data.hasChild;
  return false; // comparison leaves never accept children
}

// resolveConditionTarget turns "what's selected" into the parentId
// use-condition-flow.ts's handleDrop needs: Evento/Ação stand in for the
// tree's own (unrendered) empty root while there's no tree yet, any other
// selected id is passed through as-is (handleDrop/addChild safely no-op
// if it turns out not to accept a child).
function resolveConditionTarget(selectedId: string | null, condition: UseConditionFlowResult): string | null {
  if (selectedId === EVENT_NODE_ID || selectedId === ACTION_NODE_ID) {
    return condition.nodes.length === 0 ? condition.rootId : null;
  }
  return selectedId;
}

// RuleCanvasInner needs useReactFlow() (for fitView, see below), which
// only works inside a ReactFlowProvider - RuleCanvas supplies that.
function RuleCanvasInner({ eventData, conditionData, actionData }: RuleCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(initialNodes);
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const lastConditionIdsRef = useRef("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const condition = useConditionFlow({
    mode: conditionData.mode,
    conditionJson: conditionData.conditionJson,
    fieldSuggestions: conditionData.fieldSuggestions,
    anchor: CONDITION_ANCHOR,
    onChange: conditionData.onChange,
  });

  const actionX = CONDITION_ANCHOR.x + condition.width + ACTION_GAP;

  // Condition-tree nodes live inside the same React-Flow-managed `nodes`
  // state as Evento/Ação (not spliced in fresh at render time), so React
  // Flow's own measurement tracking (node.measured, set once via
  // ResizeObserver) survives across renders. layoutConditionTree returns
  // a brand new {id, type, position, data} object on every tree change
  // (it has no way to know a previous measured size), and if that object
  // went straight into the `nodes` prop, React Flow would see an
  // "unmeasured" node every single time - which re-fires a dimensions
  // change through onNodesChange, which re-renders this component, which
  // asks layoutConditionTree again, forever. That loop is also exactly
  // why the node stayed invisible: nodeHasDimensions() (React Flow
  // internal) never got a chance to see a stable measured size, so it
  // kept the node's CSS visibility:hidden. useLayoutEffect (not
  // useEffect) so the merge lands before paint - no visible flash of
  // unmerged state for the one frame this takes.
  useLayoutEffect(() => {
    setNodes((current) => {
      const byId = new Map(current.map((node) => [node.id, node]));
      const mergedCondition = condition.nodes.map((fresh) => {
        const existing = byId.get(fresh.id);
        return existing ? { ...fresh, measured: existing.measured, width: existing.width, height: existing.height } : fresh;
      }) as ConditionFlowNode[];
      const event = (byId.get(EVENT_NODE_ID) ?? initialNodes[0]) as EventFlowNode;
      const action = (byId.get(ACTION_NODE_ID) ?? initialNodes[1]) as ActionFlowNode;
      const next: CanvasNode[] = [event, ...mergedCondition, action];
      const unchanged = current.length === next.length && current.every((node, index) => node === next[index] || (node.id === next[index].id && node.type === next[index].type && node.position === next[index].position && node.data === next[index].data));
      return unchanged ? current : next;
    });
  }, [condition.nodes, setNodes]);

  const dropTarget = useBlockDropTarget<BlockDragPayload>({
    parsePayload: (raw) => JSON.parse(raw) as BlockDragPayload,
    onDrop: (payload) => {
      if (payload.kind === "device") {
        if (selectedId === EVENT_NODE_ID) {
          if (!payload.supportsEvent) { toast.error(payload.deviceId + " não declara eventos."); return; }
          eventData.onDeviceChange?.(payload.deviceId);
        } else if (selectedId === ACTION_NODE_ID) {
          if (!payload.supportsCommand) { toast.error(payload.deviceId + " não declara comandos."); return; }
          actionData.onDeviceChange?.(payload.deviceId);
        }
        return;
      }
      const targetId = resolveConditionTarget(selectedId, condition);
      if (targetId) condition.handleDrop(payload.kind, targetId);
    },
  });

  // Same fix this file has relied on since the old shared device-graph
  // canvas's blank-screen bug: spread the whole existing tracked node,
  // only ever overriding `data` (and, for the action node, its x - the
  // one axis the growing condition tree can force to move) - never
  // rebuild a bare {id, type, position, data}. Condition-tree nodes are
  // looked up by id (not a fixed array index) since the merge effect
  // above interleaves them between Evento and Ação; their `data` is
  // already current as of that effect; only `isSelected` needs adding
  // here, synchronously, so clicking never lags a frame behind.
  const eventNode = nodes.find((node) => node.id === EVENT_NODE_ID) as EventFlowNode | undefined;
  const actionNode = nodes.find((node) => node.id === ACTION_NODE_ID) as ActionFlowNode | undefined;
  const displayNodes: CanvasNode[] = [
    ...(eventNode ? [{ ...eventNode, data: { ...eventData, isSelected: selectedId === EVENT_NODE_ID } }] : []),
    ...nodes.filter((node) => node.id !== EVENT_NODE_ID && node.id !== ACTION_NODE_ID)
      .map((node) => ({ ...node, data: { ...node.data, isSelected: node.id === selectedId } }) as ConditionFlowNode),
    ...(actionNode ? [{ ...actionNode, data: { ...actionData, isSelected: selectedId === ACTION_NODE_ID }, position: { ...actionNode.position, x: actionX } }] : []),
  ];

  // condition.edges (the tree's own parent->child structure - and->its
  // children, or->its children, not->its child, built by
  // layoutConditionTree's walk()) has to be merged in here too, not just
  // the two fixed pipeline edges - without it the canvas draws Evento
  // straight through to Ação with every block in between rendered but
  // completely disconnected from each other and from that line.
  const displayEdges: Edge[] = [
    { id: "event-condition", source: EVENT_NODE_ID, target: condition.rootId, deletable: false, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "condition-action", source: condition.rootId, target: ACTION_NODE_ID, deletable: false, markerEnd: { type: MarkerType.ArrowClosed } },
    ...condition.edges,
  ];

  // fitView only reruns when the *set* of condition-tree node ids changes
  // (a block added or removed) - not on every keystroke inside a leaf's
  // value field, which would jar the camera mid-edit. Also gated on
  // nodesInitialized (every current node has actually been measured):
  // detail mode populates its whole tree - possibly several nodes deep -
  // on the very first render, and calling fitView before the merge
  // effect's newly-added nodes get measured computes a bounding box that
  // only covers whatever was already measured (Evento/Ação), leaving the
  // rest of the tree positioned correctly but scattered outside the
  // fitted viewport - not the same bug as the invisible-node loop this
  // file's history documents, but the same category: acting on a node's
  // geometry before React Flow has actually measured it. The early
  // return (before touching lastConditionIdsRef) means this naturally
  // retries once nodesInitialized flips true, rather than needing a
  // separate "have we fitted yet" flag.
  useEffect(() => {
    if (!nodesInitialized) return;
    const ids = condition.nodes.map((node) => node.id).sort().join(",");
    if (ids === lastConditionIdsRef.current) return;
    lastConditionIdsRef.current = ids;
    fitView();
  }, [condition.nodes, fitView, nodesInitialized]);

  const showDevices = selectedId === EVENT_NODE_ID || selectedId === ACTION_NODE_ID;
  const showConditionBlocks = canAcceptConditionBlock(selectedId, condition);

  return (
    <div className="flex gap-3">
      {conditionData.mode === "create" ? <BlockSidebar showDevices={showDevices} showConditionBlocks={showConditionBlocks} /> : null}
      <div
        className="h-[70vh] min-w-0 flex-1 overflow-hidden rounded-lg border border-border"
        onDragOver={conditionData.mode === "create" ? dropTarget.onDragOver : undefined}
        onDrop={conditionData.mode === "create" ? dropTarget.onDrop : undefined}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_event, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

// RuleCanvas renders one automation rule as Evento -> a condition block
// tree (condition-flow/, empty = "always fires") -> Ação, all in one
// canvas. Selecting a block on the canvas filters block-sidebar.tsx down
// to what can be dropped into it - a device onto Evento/Ação, a
// comparação/E/OU/NÃO onto a combinator/not/Evento/Ação (see
// canAcceptConditionBlock above) - and any drop always applies to
// whatever's selected, not to drop position (use-block-drop-target.ts).
// Used by both new.tsx (mode: "create") and detail.tsx (mode: "detail").
export function RuleCanvas(props: RuleCanvasProps) {
  return (
    <ReactFlowProvider>
      <RuleCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
