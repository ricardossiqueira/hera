import { newId, OPERATORS, type ConditionTree, type Operator, type ValueType } from "./types";
import { emptyTree, newComparison } from "./mutations";

function literalFor(type: ValueType, value: string): unknown {
  if (type === "boolean") return value === "true";
  if (type === "number") return Number(value) || 0;
  return value;
}

function serializeNode(node: ConditionTree): unknown {
  switch (node.kind) {
    case "comparison":
      return { [node.operator]: [{ var: node.field }, literalFor(node.type, node.value)] };
    case "and":
    case "or":
      return { [node.kind]: node.children.map(serializeNode) };
    case "not":
      // A not with no child yet (just had its child deleted, see
      // mutations.ts) has nothing valid to serialize - callers only ever
      // reach this from a parent that already checked isComplete first.
      return node.child ? { "!": [serializeNode(node.child)] } : null;
    case "empty":
      return null;
  }
}

// isComplete reports whether tree (and everything under it) can be
// serialized right now - false only for a childless "not" left over from
// deleting its one child (see mutations.ts's deleteNode), which the UI
// should treat as "not finished editing" rather than send to the backend.
export function isComplete(tree: ConditionTree): boolean {
  if (tree.kind === "not") return tree.child !== null && isComplete(tree.child);
  if (tree.kind === "and" || tree.kind === "or") return tree.children.every(isComplete);
  return true;
}

// serializeCondition mirrors internal/automationrule's grammar exactly
// (parseCondition below is its exact inverse), so nothing this editor
// produces ever needs a JSON-textarea fallback.
export function serializeCondition(tree: ConditionTree): string {
  if (tree.kind === "empty" || !isComplete(tree)) return "";
  return JSON.stringify(serializeNode(tree));
}

function parseComparison(operator: Operator, operands: unknown): ConditionTree | null {
  if (!Array.isArray(operands) || operands.length !== 2) return null;
  const [left, right] = operands as [unknown, unknown];
  if (typeof left !== "object" || left === null || typeof (left as { var?: unknown }).var !== "string") return null;
  const field = (left as { var: string }).var;
  if (typeof right === "boolean") return { kind: "comparison", id: newId("cmp"), field, operator, type: "boolean", value: String(right) };
  if (typeof right === "number") return { kind: "comparison", id: newId("cmp"), field, operator, type: "number", value: String(right) };
  if (typeof right === "string") return { kind: "comparison", id: newId("cmp"), field, operator, type: "string", value: right };
  return null;
}

function parseNode(node: unknown): ConditionTree | null {
  if (typeof node !== "object" || node === null) return null;
  const entries = Object.entries(node as Record<string, unknown>);
  if (entries.length !== 1) return null;
  const [operator, operand] = entries[0];
  if (operator === "and" || operator === "or") {
    if (!Array.isArray(operand) || operand.length < 2) return null;
    const children = operand.map(parseNode);
    if (!children.every((child): child is ConditionTree => child !== null)) return null;
    return { kind: operator, id: newId(operator), children };
  }
  if (operator === "!") {
    if (!Array.isArray(operand) || operand.length !== 1) return null;
    const child = parseNode(operand[0]);
    if (!child) return null;
    return { kind: "not", id: newId("not"), child };
  }
  if ((OPERATORS as string[]).includes(operator)) return parseComparison(operator as Operator, operand);
  return null;
}

// parseCondition reads whatever this editor itself last wrote. It's only
// ever called with a non-empty raw in "detail" mode (new.tsx's create-mode
// conditionJson always starts at "" and is never pre-filled from
// elsewhere), so the ConditionTree it returns is never fed back into
// serializeCondition/onChange - a condition outside this editor's own
// grammar (hand-edited via the API, or the backend's rarely-used bare
// `true`/`false` literal form) falls back to a single blank comparison
// purely so detail view renders *something* instead of crashing; nothing
// gets silently corrupted since detail mode never writes it back.
export function parseCondition(raw: string): ConditionTree {
  const trimmed = raw.trim();
  if (trimmed === "") return emptyTree();
  let node: unknown;
  try {
    node = JSON.parse(trimmed);
  } catch {
    return emptyTree();
  }
  return parseNode(node) ?? newComparison();
}
