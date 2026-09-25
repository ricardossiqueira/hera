import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ParameterSchema = Record<string, { type?: string; required?: boolean }>;

export function parseParameterSchema(parametersJson?: string): ParameterSchema {
  try { return parametersJson ? JSON.parse(parametersJson) as ParameterSchema : {}; } catch { return {}; }
}

// coerceParameterValues turns a ParametersForm's raw field values into the
// typed object a command/action's `parameters` actually needs (boolean
// checkbox state, numeric strings converted, empty optional fields
// dropped) - shared by whoever calls publishCommand or serializes an
// automation rule's action.
export function coerceParameterValues(schema: ParameterSchema, values: Record<string, string | boolean>): Record<string, unknown> {
  const parameters: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(schema)) {
    const value = values[name];
    if (field.type === "boolean") parameters[name] = value === true;
    else if (value !== undefined && value !== "") parameters[name] = field.type === "number" || field.type === "integer" ? Number(value) : value;
  }
  return parameters;
}

// ParametersForm renders one Label+Input (or checkbox for booleans) per
// field in schema - a flat JSON-schema-ish blob, not full JSON Schema
// (no nesting, no arrays, no oneOf). Controlled: the caller owns values
// and decides what to do with them (publish immediately, as
// devices/detail.tsx's CommandForm does, or serialize into an automation
// rule's actionParametersJson, as pages/automations.tsx does).
export function ParametersForm({ idPrefix, schema, values, onChange }: {
  idPrefix: string;
  schema: ParameterSchema;
  values: Record<string, string | boolean>;
  onChange: (values: Record<string, string | boolean>) => void;
}) {
  const setValue = (name: string, value: string | boolean) => onChange({ ...values, [name]: value });
  return <>
    {Object.entries(schema).map(([name, field]) => <div key={name} className="mt-3 space-y-1.5">
      <Label htmlFor={`${idPrefix}-${name}`}>{name}{field.required ? " *" : ""}</Label>
      {field.type === "boolean" ? <input id={`${idPrefix}-${name}`} type="checkbox" checked={values[name] === true} onChange={(event) => setValue(name, event.target.checked)} /> :
        <Input id={`${idPrefix}-${name}`} type={field.type === "number" || field.type === "integer" ? "number" : "text"} value={typeof values[name] === "string" ? values[name] : ""} onChange={(event) => setValue(name, event.target.value)} />}
    </div>)}
  </>;
}
