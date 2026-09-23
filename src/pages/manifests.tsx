import { useEffect, useState } from "react";
import { FileJson, Plus, Save, Upload } from "lucide-react";
import {
  createDeviceManifestDraft,
  createDeviceManifestRevisionDraft,
  getDeviceManifest,
  listDeviceManifests,
  publishDeviceManifest,
  type DeviceManifest,
} from "@/api/gateway";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const starterDocument = `{
  "schema_version": 1,
  "id": "new-device",
  "display_name": "New device",
  "provisioning": {
    "protocol": "http-nvs-v1",
    "model": "new-device",
    "required_protocol_version": 1
  },
  "mqtt": { "topics": ["command"] },
  "capabilities": { "commands": [], "events": [] }
}`;

export function Manifests() {
  const [manifests, setManifests] = useState<DeviceManifest[]>([]);
  const [selected, setSelected] = useState<DeviceManifest>();
  const [documentJson, setDocumentJson] = useState(starterDocument);
  const [draftRevision, setDraftRevision] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      setManifests(await listDeviceManifests());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível listar manifests.");
    }
  };

  useEffect(() => { void reload(); }, []);

  const select = async (manifest: DeviceManifest) => {
    setError(undefined); setDraftRevision(undefined);
    try {
      const response = await getDeviceManifest(manifest.id);
      setSelected(response.manifest);
      setDocumentJson(JSON.stringify(JSON.parse(response.manifest.documentJson), null, 2));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ler o manifest.");
    }
  };

  const newManifest = () => {
    setSelected(undefined); setDraftRevision(undefined); setDocumentJson(starterDocument); setError(undefined);
  };

  const saveDraft = async () => {
    setBusy(true); setError(undefined);
    try {
      const response = selected
        ? await createDeviceManifestRevisionDraft(selected.id, documentJson)
        : await createDeviceManifestDraft(documentJson);
      setDraftRevision(response.manifest.revision);
      setSelected(response.manifest);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Manifest inválido.");
    } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!selected || !draftRevision) return;
    setBusy(true); setError(undefined);
    try {
      await publishDeviceManifest(selected.id, draftRevision);
      setDraftRevision(undefined);
      await reload();
      await select({ ...selected, revision: draftRevision });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar o manifest.");
    } finally { setBusy(false); }
  };

  return <>
    <PageHeading title="Manifests" description="Definições versionadas de dispositivos em JSON. Rascunhos não alteram devices nem o broker." />
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <Card><CardContent className="space-y-2">
        <Button className="w-full" variant="outline" onClick={newManifest}><Plus /> Novo manifest</Button>
        {manifests.map((manifest) => <Button key={manifest.id} className="h-auto w-full justify-start text-left" variant={selected?.id === manifest.id ? "secondary" : "ghost"} onClick={() => void select(manifest)}>
          <FileJson /><span>{manifest.displayName}<small className="block text-muted-foreground">{manifest.id} · rev {manifest.revision}</small></span>
        </Button>)}
      </CardContent></Card>
      <Card><CardContent className="space-y-4">
        <textarea aria-label="Manifest JSON" value={documentJson} onChange={(event) => setDocumentJson(event.target.value)} className="min-h-[32rem] w-full rounded-md border border-input bg-background p-3 font-mono text-sm" spellCheck={false} />
        {draftRevision ? <Alert><AlertDescription>Rascunho da revisão {draftRevision} salvo. Publique-o para disponibilizá-lo no provisionamento.</AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <div className="flex gap-3"><Button disabled={busy} onClick={() => void saveDraft()}><Save /> Salvar rascunho</Button><Button disabled={busy || !draftRevision} variant="outline" onClick={() => void publish()}><Upload /> Publicar revisão</Button></div>
      </CardContent></Card>
    </div>
  </>;
}
