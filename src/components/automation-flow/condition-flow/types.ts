export type Operator = "==" | "!=" | "<" | "<=" | ">" | ">=";
export type ValueType = "string" | "number" | "boolean";

export const OPERATORS: Operator[] = ["==", "!=", "<", "<=", ">", ">="];

// ConditionTree mirrors internal/automationrule's validateConditionNode
// grammar 1:1 (iot-gateway): and/or (2+ children), ! (0 or 1 child - null
// only transiently, see deleteNode in mutations.ts), comparisons, and the
// empty placeholder (no condition at all - "always fires"). Every node
// carries a stable `id`, generated once at creation and never regenerated
// on edit - see use-condition-flow.ts's doc comment for why (losing id
// stability mid-edit would drop focus out of whatever leaf input the
// operator is typing in).
export type ConditionTree =
  | { kind: "comparison"; id: string; field: string; operator: Operator; type: ValueType; value: string }
  | { kind: "and" | "or"; id: string; children: ConditionTree[] }
  | { kind: "not"; id: string; child: ConditionTree | null }
  | { kind: "empty"; id: string };

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

// ConditionNodeData is RuleCanvas's contract with the pages that use it
// (new.tsx, detail.tsx) - unchanged in shape from the old single-block
// condition-node.tsx, so those pages needed no changes beyond this type's
// import path.
export interface ConditionNodeData {
  mode: "create" | "detail";
  conditionJson: string;
  fieldSuggestions: string[];
  onChange?: (json: string) => void;
}
