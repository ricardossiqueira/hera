import { newId, type ConditionTree, type Operator, type ValueType } from "./types";

// Mirrors internal/automationrule's maxConditionDepth (iot-gateway) - the
// root is depth 0, so a node already at MAX_DEPTH cannot gain a child
// (that child would sit at MAX_DEPTH + 1, which the backend rejects).
export const MAX_DEPTH = 6;

export function emptyTree(): ConditionTree {
  return { kind: "empty", id: newId("empty") };
}

export function newComparison(): ConditionTree {
  return { kind: "comparison", id: newId("cmp"), field: "", operator: "==", type: "string", value: "" };
}

export type AddableKind = "comparison" | "and" | "or" | "not";

// newNode never returns a node in an incomplete state: and/or start with
// two default comparisons (the backend requires 2+ operands) and not
// starts with one, so the tree is always serializable right after any
// single addChild call - no transient "and with 0 children" state to
// hide or warn about elsewhere in the UI.
function newNode(kind: AddableKind): ConditionTree {
  switch (kind) {
    case "comparison": return newComparison();
    case "and":
    case "or": return { kind, id: newId(kind), children: [newComparison(), newComparison()] };
    case "not": return { kind: "not", id: newId("not"), child: newComparison() };
  }
}

// depthOf returns targetId's depth in tree (root is 0), or null if absent.
export function depthOf(tree: ConditionTree, targetId: string, depth = 0): number | null {
  if (tree.id === targetId) return depth;
  if (tree.kind === "and" || tree.kind === "or") {
    for (const child of tree.children) {
      const found = depthOf(child, targetId, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  if (tree.kind === "not" && tree.child) return depthOf(tree.child, targetId, depth + 1);
  return null;
}

// addChild handles all three "this node can accept one more child" cases:
// the empty placeholder (parentId is the whole tree, replaced outright),
// and/or (appended to children), and a childless not (fills its one
// slot - see deleteNode's doc comment for how a not becomes childless).
export function addChild(tree: ConditionTree, parentId: string, kind: AddableKind): ConditionTree {
  if (tree.id === parentId) {
    if (tree.kind === "empty") return newNode(kind);
    if (tree.kind === "and" || tree.kind === "or") return { ...tree, children: [...tree.children, newNode(kind)] };
    if (tree.kind === "not" && !tree.child) return { ...tree, child: newNode(kind) };
    return tree;
  }
  if (tree.kind === "and" || tree.kind === "or") {
    return { ...tree, children: tree.children.map((child) => addChild(child, parentId, kind)) };
  }
  if (tree.kind === "not" && tree.child) return { ...tree, child: addChild(tree.child, parentId, kind) };
  return tree;
}

export function updateLeaf(tree: ConditionTree, id: string, patch: Partial<{ field: string; operator: Operator; type: ValueType; value: string }>): ConditionTree {
  if (tree.id === id && tree.kind === "comparison") return { ...tree, ...patch };
  if (tree.kind === "and" || tree.kind === "or") return { ...tree, children: tree.children.map((child) => updateLeaf(child, id, patch)) };
  if (tree.kind === "not" && tree.child) return { ...tree, child: updateLeaf(tree.child, id, patch) };
  return tree;
}

export function toggleCombinator(tree: ConditionTree, id: string): ConditionTree {
  if (tree.id === id && (tree.kind === "and" || tree.kind === "or")) return { ...tree, kind: tree.kind === "and" ? "or" : "and" };
  if (tree.kind === "and" || tree.kind === "or") return { ...tree, children: tree.children.map((child) => toggleCombinator(child, id)) };
  if (tree.kind === "not" && tree.child) return { ...tree, child: toggleCombinator(tree.child, id) };
  return tree;
}

// deleteNode removes id from wherever it sits in tree:
// - the root itself: the whole tree resets to the empty placeholder.
// - a direct child of and/or: removed from `children`; if exactly one
//   child remains, the and/or wrapper is dropped and that child takes
//   its place (mirrors the old flat condition-builder's "1 clause = no
//   wrapper" serialize() rule - and/or can never end up with < 2
//   children, so there's nothing to warn about).
// - the child of a not: not.child becomes null (not, unlike and/or, has
//   no sibling to promote - it just goes back to "waiting for its one
//   child", exposing its add handle again, same as right after creation
//   minus the default comparison).
export function deleteNode(tree: ConditionTree, id: string): ConditionTree {
  if (tree.id === id) return emptyTree();
  return deleteChild(tree, id);
}

function deleteChild(tree: ConditionTree, id: string): ConditionTree {
  if (tree.kind === "and" || tree.kind === "or") {
    if (tree.children.some((child) => child.id === id)) {
      const remaining = tree.children.filter((child) => child.id !== id);
      return remaining.length === 1 ? remaining[0] : { ...tree, children: remaining };
    }
    return { ...tree, children: tree.children.map((child) => deleteChild(child, id)) };
  }
  if (tree.kind === "not") {
    if (tree.child?.id === id) return { ...tree, child: null };
    return tree.child ? { ...tree, child: deleteChild(tree.child, id) } : tree;
  }
  return tree;
}
