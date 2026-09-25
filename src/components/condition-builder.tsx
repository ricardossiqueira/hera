import { useState } from "react";
import { Code, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Operator = "==" | "!=" | "<" | "<=" | ">" | ">=";
type ValueType = "string" | "number" | "boolean";
type Combinator = "and" | "or";

type Clause = { field: string; operator: Operator; type: ValueType; value: string };

const OPERATORS: Operator[] = ["==", "!=", "<", "<=", ">", ">="];

function newClause(field = ""): Clause {
  return { field, operator: "==", type: "string", value: "" };
}

function clauseValueLiteral(clause: Clause): unknown {
  if (clause.type === "boolean") return clause.value === "true";
  if (clause.type === "number") return Number(clause.value) || 0;
  return clause.value;
}

function clauseNode(clause: Clause): unknown {
  return { [clause.operator]: [{ var: clause.field }, clauseValueLiteral(clause)] };
}

// serialize mirrors internal/automationrule's supported subset exactly: 0
// clauses is "" (always true, no condition object at all); 1 clause is a
// bare comparison node (and/or require 2+ operands there); 2+ wraps in a
// single top-level combinator - no arbitrary nesting, see the plan this
// was built from.
function serialize(combinator: Combinator, clauses: Clause[]): string {
  const usable = clauses.filter((clause) => clause.field.trim() !== "");
  if (usable.length === 0) return "";
  if (usable.length === 1) return JSON.stringify(clauseNode(usable[0]));
  return JSON.stringify({ [combinator]: usable.map(clauseNode) });
}

// parseFlat recognizes exactly what serialize() produces (plus the
// single-clause and empty cases), so a condition built elsewhere (or one
// this component itself just wrote) round-trips back into the visual
// form. Anything else - deeper nesting, "!", a var used as a bare
// boolean - returns null, and the caller falls back to the JSON editor
// rather than silently discarding part of the condition.
function parseFlat(json: string): { combinator: Combinator; clauses: Clause[] } | null {
  if (json.trim() === "") return { combinator: "and", clauses: [] };
  let node: unknown;
  try { node = JSON.parse(json); } catch { return null; }
  const asClause = (candidate: unknown): Clause | null => {
    if (typeof candidate !== "object" || candidate === null) return null;
    const entries = Object.entries(candidate as Record<string, unknown>);
    if (entries.length !== 1) return null;
    const [operator, operands] = entries[0];
    if (!OPERATORS.includes(operator as Operator) || !Array.isArray(operands) || operands.length !== 2) return null;
    const [left, right] = operands;
    if (typeof left !== "object" || left === null || typeof (left as { var?: unknown }).var !== "string") return null;
    const field = (left as { var: string }).var;
    if (typeof right === "boolean") return { field, operator: operator as Operator, type: "boolean", value: String(right) };
    if (typeof right === "number") return { field, operator: operator as Operator, type: "number", value: String(right) };
    if (typeof right === "string") return { field, operator: operator as Operator, type: "string", value: right };
    return null;
  };
  const single = asClause(node);
  if (single) return { combinator: "and", clauses: [single] };
  if (typeof node === "object" && node !== null) {
    const entries = Object.entries(node as Record<string, unknown>);
    if (entries.length === 1 && (entries[0][0] === "and" || entries[0][0] === "or") && Array.isArray(entries[0][1])) {
      const clauses = (entries[0][1] as unknown[]).map(asClause);
      if (clauses.every((clause): clause is Clause => clause !== null) && clauses.length >= 2) {
        return { combinator: entries[0][0] as Combinator, clauses };
      }
    }
  }
  return null;
}

// ConditionBuilder edits an AutomationRule's conditionJson. It covers the
// common case - a list of field/operator/value clauses joined by one
// combinator - without a JSON textarea; a condition it cannot represent
// (deeper and/or/! nesting than this form produces) falls back to a raw
// JSON editor automatically, never silently truncating it. See
// internal/automationrule (iot-gateway) for the full supported grammar.
export function ConditionBuilder({ value, onChange, fieldSuggestions }: {
  value: string;
  onChange: (json: string) => void;
  fieldSuggestions?: string[];
}) {
  const parsed = parseFlat(value);
  const [jsonMode, setJsonMode] = useState(parsed === null);
  const [combinator, setCombinator] = useState<Combinator>(parsed?.combinator ?? "and");
  const [clauses, setClauses] = useState<Clause[]>(parsed?.clauses ?? []);

  const applyClauses = (nextCombinator: Combinator, nextClauses: Clause[]) => {
    setCombinator(nextCombinator);
    setClauses(nextClauses);
    onChange(serialize(nextCombinator, nextClauses));
  };

  const datalistId = "condition-field-suggestions";

  if (jsonMode) {
    return <div className="space-y-2">
      <textarea
        aria-label="Condição (JSON)"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder='Vazio = sempre dispara. Ex: {"==": [{"var": "pressed"}, true]}'
        className="min-h-24 w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
        spellCheck={false}
      />
      <Button type="button" size="sm" variant="ghost" onClick={() => {
        const reparsed = parseFlat(value);
        if (reparsed) { setCombinator(reparsed.combinator); setClauses(reparsed.clauses); setJsonMode(false); }
      }}>Usar formulário visual</Button>
    </div>;
  }

  return <div className="space-y-2">
    {fieldSuggestions?.length ? <datalist id={datalistId}>{fieldSuggestions.map((field) => <option key={field} value={field} />)}</datalist> : null}
    {clauses.length === 0 ? <p className="text-sm text-muted-foreground">Sem condição — a regra dispara sempre que o evento acontecer.</p> : null}
    {clauses.map((clause, index) => (
      <div key={index} className="flex flex-wrap items-center gap-2">
        {index > 0 ? (
          <Select value={combinator} onValueChange={(next) => applyClauses(next as Combinator, clauses)}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="and">E</SelectItem><SelectItem value="or">OU</SelectItem></SelectContent>
          </Select>
        ) : <span className="w-20 text-sm text-muted-foreground">Se</span>}
        <Input
          list={datalistId}
          className="w-40"
          placeholder="campo"
          value={clause.field}
          onChange={(event) => applyClauses(combinator, clauses.map((item, i) => i === index ? { ...item, field: event.target.value } : item))}
        />
        <Select value={clause.operator} onValueChange={(op) => applyClauses(combinator, clauses.map((item, i) => i === index ? { ...item, operator: op as Operator } : item))}>
          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>{OPERATORS.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={clause.type} onValueChange={(type) => applyClauses(combinator, clauses.map((item, i) => i === index ? { ...item, type: type as ValueType } : item))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="string">texto</SelectItem>
            <SelectItem value="number">número</SelectItem>
            <SelectItem value="boolean">booleano</SelectItem>
          </SelectContent>
        </Select>
        {clause.type === "boolean" ? (
          <Select value={clause.value || "true"} onValueChange={(next) => applyClauses(combinator, clauses.map((item, i) => i === index ? { ...item, value: next } : item))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="true">true</SelectItem><SelectItem value="false">false</SelectItem></SelectContent>
          </Select>
        ) : (
          <Input
            className="w-32"
            type={clause.type === "number" ? "number" : "text"}
            placeholder="valor"
            value={clause.value}
            onChange={(event) => applyClauses(combinator, clauses.map((item, i) => i === index ? { ...item, value: event.target.value } : item))}
          />
        )}
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Remover condição" onClick={() => applyClauses(combinator, clauses.filter((_, i) => i !== index))}>
          <Trash2 />
        </Button>
      </div>
    ))}
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => applyClauses(combinator, [...clauses, newClause()])}>
        <Plus /> Adicionar condição
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setJsonMode(true)}>
        <Code /> Editar como JSON
      </Button>
    </div>
  </div>;
}
