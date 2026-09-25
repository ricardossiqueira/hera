import { MarkerType, type Edge, type XYPosition } from "@xyflow/react";
import type { ComparisonFlowNode } from "./comparison-node";
import type { CombinatorFlowNode } from "./combinator-node";
import { MAX_DEPTH, type AddableKind } from "./mutations";
import type { NotFlowNode } from "./not-node";
import type { ConditionTree, Operator, ValueType } from "./types";

export type ConditionFlowNode = ComparisonFlowNode | CombinatorFlowNode | NotFlowNode;

const H_SPACING = 260;
const V_SPACING = 96;
const LEAF_WIDTH = 224;

export interface ConditionFlowCallbacks {
  onUpdateLeaf: (id: string, patch: Partial<{ field: string; operator: Operator; type: ValueType; value: string }>) => void;
  onToggleCombinator: (id: string) => void;
  onDelete: (id: string) => void;
}

export interface ConditionLayout {
  nodes: ConditionFlowNode[];
  edges: Edge[];
  rootId: string;
  // Measured bounding box of the whole subtree, anchor-relative -
  // rule-canvas.tsx uses `width` to push the Ação node over so a growing
  // tree never overlaps it (see the plan this was built from).
  width: number;
  height: number;
}

interface PositionInfo { x: number; y: number; depth: number }

// assignPositions is a classic node-link tree layout, written by hand
// (see the plan this was built from for why: the project has no
// dagre/d3-hierarchy/elkjs dependency and condition trees are capped at
// depth 6, small enough that a recursive walk is simpler than adding one).
// x grows with depth (left to right); y is the average of a node's
// children's y, with leaves (comparisons, and a childless not) claiming
// the next sequential vertical slot in visitation order.
function assignPositions(tree: ConditionTree, depth: number, nextLeafSlot: { current: number }, out: Map<string, PositionInfo>): number {
  if (tree.kind === "and" || tree.kind === "or") {
    const ys = tree.children.map((child) => assignPositions(child, depth + 1, nextLeafSlot, out));
    const y = ys.reduce((sum, value) => sum + value, 0) / ys.length;
    out.set(tree.id, { x: depth * H_SPACING, y, depth });
    return y;
  }
  if (tree.kind === "not" && tree.child) {
    const y = assignPositions(tree.child, depth + 1, nextLeafSlot, out);
    out.set(tree.id, { x: depth * H_SPACING, y, depth });
    return y;
  }
  const y = nextLeafSlot.current * V_SPACING;
  nextLeafSlot.current += 1;
  out.set(tree.id, { x: depth * H_SPACING, y, depth });
  return y;
}

// No sourceHandle: every non-leaf node's real children all come off its
// one default (unnamed) source handle - see combinator-node.tsx's doc
// comment for why that handle is deliberately left unnamed.
function edgeTo(sourceId: string, targetId: string): Edge {
  return { id: `${sourceId}->${targetId}`, source: sourceId, target: targetId, deletable: false, markerEnd: { type: MarkerType.ArrowClosed } };
}

type NonEmptyTree = Exclude<ConditionTree, { kind: "empty" }>;

function buildNode(tree: NonEmptyTree, position: XYPosition, mode: "create" | "detail", fieldSuggestions: string[], depth: number, callbacks: ConditionFlowCallbacks): ConditionFlowNode {
  switch (tree.kind) {
    case "comparison":
      return {
        id: tree.id, type: "comparison", position,
        data: {
          mode, field: tree.field, operator: tree.operator, type: tree.type, value: tree.value, fieldSuggestions,
          onChange: (patch) => callbacks.onUpdateLeaf(tree.id, patch),
          onDelete: () => callbacks.onDelete(tree.id),
        },
      };
    case "and":
    case "or":
      return {
        id: tree.id, type: "combinator", position,
        data: {
          mode, kind: tree.kind, canAddChild: depth < MAX_DEPTH,
          onToggle: () => callbacks.onToggleCombinator(tree.id),
          onDelete: () => callbacks.onDelete(tree.id),
        },
      };
    case "not":
      return {
        id: tree.id, type: "not", position,
        data: { mode, hasChild: tree.child !== null, onDelete: () => callbacks.onDelete(tree.id) },
      };
  }
}

// tree is typed as the full ConditionTree (not NonEmptyTree) purely
// because "empty" is structurally reachable through this recursion as far
// as TypeScript can tell (children: ConditionTree[]), even though it
// never occurs below the root by construction (mutations.ts never nests
// one) - the guard below is what actually narrows it for buildNode.
function walk(tree: ConditionTree, positions: Map<string, PositionInfo>, anchor: XYPosition, mode: "create" | "detail", fieldSuggestions: string[], callbacks: ConditionFlowCallbacks, nodes: ConditionFlowNode[], edges: Edge[]) {
  if (tree.kind === "empty") return;
  const info = positions.get(tree.id);
  if (!info) return;
  nodes.push(buildNode(tree, { x: anchor.x + info.x, y: anchor.y + info.y }, mode, fieldSuggestions, info.depth, callbacks));
  if (tree.kind === "and" || tree.kind === "or") {
    for (const child of tree.children) {
      edges.push(edgeTo(tree.id, child.id));
      walk(child, positions, anchor, mode, fieldSuggestions, callbacks, nodes, edges);
    }
  } else if (tree.kind === "not" && tree.child) {
    edges.push(edgeTo(tree.id, tree.child.id));
    walk(tree.child, positions, anchor, mode, fieldSuggestions, callbacks, nodes, edges);
  }
}

// layoutConditionTree turns the in-memory ConditionTree into React Flow
// nodes/edges rendered inline in rule-canvas.tsx's own canvas, anchored at
// `anchor` (the spot between Evento and Ação). An empty tree (no
// condition yet) renders nothing - there's no placeholder block; building
// starts by selecting Evento or Ação and dragging a block from the
// sidebar (see rule-canvas.tsx / block-sidebar.tsx).
export function layoutConditionTree(tree: ConditionTree, anchor: XYPosition, mode: "create" | "detail", fieldSuggestions: string[], callbacks: ConditionFlowCallbacks): ConditionLayout {
  if (tree.kind === "empty") return { nodes: [], edges: [], rootId: tree.id, width: 0, height: 0 };

  const positions = new Map<string, PositionInfo>();
  const leafSlot = { current: 0 };
  assignPositions(tree, 0, leafSlot, positions);

  const nodes: ConditionFlowNode[] = [];
  const edges: Edge[] = [];
  walk(tree, positions, anchor, mode, fieldSuggestions, callbacks, nodes, edges);

  const maxDepth = Math.max(...Array.from(positions.values()).map((info) => info.depth));
  const width = maxDepth * H_SPACING + LEAF_WIDTH + 32;
  const height = Math.max(leafSlot.current, 1) * V_SPACING;

  return { nodes, edges, rootId: tree.id, width, height };
}
