import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Cpu, Radar, RefreshCw } from "lucide-react";
import { type DiscoveredDeviceV2, type DiscoveryStatus, listDiscoveryV2 } from "@/api/device-v2";
import { PageHeading } from "@/components/page-heading";
import { ResourceEmpty, ResourceField, ResourceIdentity, ResourceList, ResourceListItem, ResourceNote, SummaryStrip, matchesSearch } from "@/components/resource-list";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";

const statusLabels: Record<DiscoveryStatus, string> = {
  seen: "Encontrado", inspected: "Inspecionado", pairing_required: "Pareamento necessário",
  ready_to_register: "Pronto para registro", registered: "Registrado", rejected: "Rejeitado", offline: "Offline",
};
const trustLabels = { trusted: "Identidade confiável", unknown: "Confiança desconhecida", invalid: "Identidade inválida" };

export function Discovery() {
  const [entries, setEntries] = useState<DiscoveredDeviceV2[]>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const refresh = async () => { setLoading(true); try { setEntries(await listDiscoveryV2()); setError(undefined); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao consultar discovery."); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 10_000); return () => window.clearInterval(timer); }, []);
  const visible = entries?.filter((entry) => matchesSearch(query, entry.deviceUid, entry.model, entry.address, entry.manifest?.display_name, statusLabels[entry.status], trustLabels[entry.trust])) ?? [];

  return <>
    <PageHeading eyebrow="Meu gateway" title="Discovery" description="Encontre e conheça os dispositivos da sua rede."
      action={<Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "motion-safe:animate-spin" : ""} /> Atualizar</Button>} />
    <SummaryStrip items={[
      { label: "Descobertos", value: entries?.length, note: "Anúncios na rede local" },
      { label: "Prontos para registro", value: entries?.filter((entry) => entry.status === "ready_to_register").length, note: "Conforme o Discovery" },
      { label: "Precisam de atenção", value: entries?.filter((entry) => entry.status === "rejected" || entry.status === "offline" || entry.trust === "invalid").length, note: "Rejeitados, offline ou inválidos" },
    ]} />
    <ResourceList title="Anúncios na rede" searchLabel="Buscar por dispositivo, UID ou endereço" query={query} onQueryChange={setQuery} total={entries?.length} visible={visible.length} loading={loading} error={error}
      empty={<ResourceEmpty icon={Radar} title="À procura dos seus dispositivos">Nenhum dispositivo anunciado no momento. Verifique se ele está ligado e acessível na rede do gateway. A lista atualiza a cada 10 segundos.</ResourceEmpty>}>
      {visible.map((entry) => <ResourceListItem key={entry.deviceUid}>
        <Link to="/discovery/$deviceUid" params={{ deviceUid: entry.deviceUid }} aria-label={entry.deviceUid}>
          <ResourceIdentity icon={Cpu} name={entry.manifest?.display_name ?? entry.model}><span>{entry.deviceUid}</span><span>Firmware {entry.firmwareVersion}</span></ResourceIdentity>
          <span className="resource-details">
            <ResourceField label="Endpoint">{entry.address}:{entry.port}<small>{entry.model}</small></ResourceField>
            <ResourceField label="Manifest">{entry.manifest ? entry.manifest.manifest_id : "Inspeção indisponível"}<small title={entry.manifestSha256}>{entry.manifestSha256.slice(0, 12)}…</small></ResourceField>
          </span>
          <span className="resource-state"><span><StatusIndicator state={entry.status === "rejected" || entry.trust === "invalid" ? "offline" : entry.status === "ready_to_register" || entry.status === "registered" ? "online" : "pending"}>{statusLabels[entry.status] ?? entry.status}</StatusIndicator><small>{trustLabels[entry.trust] ?? entry.trust}</small></span><ChevronRight aria-hidden="true" /></span>
        </Link>
      </ResourceListItem>)}
    </ResourceList>
    <ResourceNote icon={Radar} title="Da rede para o seu workspace">Inspecione o dispositivo e suas capacidades antes de registrar. Anúncios com falha continuam acessíveis para consultar o diagnóstico. Atualização automática a cada 10 segundos.</ResourceNote>
  </>;
}
