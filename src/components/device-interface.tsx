import type { DeviceManifestV2, FieldSchema, PublishDefinitionV2 } from "@/api/device-v2";
import { outputLabel } from "@/api/device-v2";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Fields({ schema }: { schema?: FieldSchema }) {
  const fields = Object.entries(schema ?? {});
  if (!fields.length) return <p className="text-sm text-muted-foreground">Sem campos de domínio declarados.</p>;
  return <ul className="mt-2 flex flex-wrap gap-2 text-xs">{fields.map(([name, field]) => <li key={name} className="rounded border px-2 py-1"><code>{name}</code>: {field.type}{field.required ? " · obrigatório" : ""}</li>)}</ul>;
}

function Output({ output }: { output: PublishDefinitionV2 }) {
  return <div className="rounded-lg border p-3">
    <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">publica</Badge><strong>{outputLabel(output.channel)}</strong>{output.retained ? <Badge variant="outline">retained</Badge> : null}</div>
    {output.channel === "event" ? <div className="mt-2 space-y-3">{output.events?.map((event) => <div key={event.type}><code className="text-sm">{event.type}</code><Fields schema={event.payload} /></div>)}</div> : <Fields schema={output.schema} />}
  </div>;
}

/** A pure projection of the manifest, shared by discovery confirmation and device detail. */
export function DeviceInterface({ manifest }: { manifest: DeviceManifestV2 }) {
  const commands = manifest.mqtt.subscribe.flatMap((entry) => entry.commands);
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card>
      <CardHeader><CardTitle>Saídas declaradas</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {manifest.mqtt.publish.length ? manifest.mqtt.publish.map((output) => <Output key={output.channel} output={output} />) : <p className="text-sm text-muted-foreground">Este device não publica canais MQTT.</p>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Entradas declaradas</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {commands.length ? commands.map((command) => <div key={command.type} className="rounded-lg border p-3"><div className="flex items-center gap-2"><Badge variant="secondary">assina command</Badge><code className="font-medium">{command.type}</code></div><Fields schema={command.parameters} /></div>) : <p className="text-sm text-muted-foreground">Este device não recebe comandos MQTT.</p>}
      </CardContent>
    </Card>
  </div>;
}
