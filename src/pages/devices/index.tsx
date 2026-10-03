import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Cpu, Radar, RefreshCw } from "lucide-react";
import { type RegisteredDeviceV2 } from "@/api/device-v2";
import { useHera } from "@/context/hera-context";
import { PageHeading } from "@/components/page-heading";
import { ResourceEmpty, ResourceField, ResourceIdentity, ResourceList, ResourceListItem, ResourceNote, SummaryStrip, matchesSearch } from "@/components/resource-list";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";

const stateLabels: Record<RegisteredDeviceV2["activeState"], string> = {
  active: "Ativo", offline: "Offline", pending: "Pendente", failed: "Falha",
};

export function Devices() {
  const { devices: { data: devices, error, loading }, refreshDevices } = useHera();
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const visible = devices?.filter((device) => matchesSearch(query, device.deviceId, device.deviceUid, device.manifest.display_name, device.manifest.manifest_id, stateLabels[device.activeState])) ?? [];
  async function refresh() {
    setRefreshing(true);
    try { await refreshDevices(); } finally { setRefreshing(false); }
  }

  return <>
    <PageHeading eyebrow="Meu gateway" title="Dispositivos" description="Cada dispositivo, sua interface. Conheça tudo o que faz parte do seu workspace."
      action={<div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={loading || refreshing} onClick={() => void refresh()}><RefreshCw className={refreshing ? "motion-safe:animate-spin" : ""} /> Atualizar</Button>
        <Button asChild><Link to="/discovery"><Radar /> Abrir Discovery</Link></Button>
      </div>} />
    <SummaryStrip items={[
      { label: "Registrados", value: devices?.length, note: "Dispositivos no gateway" },
      { label: "Ativos", value: devices?.filter((device) => device.activeState === "active").length, note: "Ativação concluída" },
      { label: "Precisam de atenção", value: devices?.filter((device) => device.activeState === "pending" || device.activeState === "failed").length, note: "Pendentes ou com falha" },
    ]} />
    <ResourceList title="Dispositivos registrados" searchLabel="Buscar dispositivos" query={query} onQueryChange={setQuery} total={devices?.length} visible={visible.length} loading={loading} error={error}
      empty={<ResourceEmpty icon={Cpu} title="Seu workspace começa aqui" action={<Button variant="outline" asChild><Link to="/discovery">Encontrar dispositivos</Link></Button>}>Nenhum dispositivo registrado. Abra Discovery para encontrar dispositivos na rede.</ResourceEmpty>}>
      {visible.map((device) => <ResourceListItem key={device.deviceId}>
        <Link to="/devices/$deviceId" params={{ deviceId: device.deviceId }} aria-label={device.deviceId}>
          <ResourceIdentity icon={Cpu} name={device.deviceId}><span>{device.manifest.display_name}</span><span>{device.deviceUid}</span></ResourceIdentity>
          <span className="resource-details">
            <ResourceField label="Manifest">{device.manifest.manifest_id}<small>Revisão {device.manifestRevision}</small></ResourceField>
            <ResourceField label="Interface">{device.manifest.mqtt.publish.length} publica · {device.manifest.mqtt.subscribe.flatMap((item) => item.commands).length} comandos<small>Firmware {device.firmwareVersion}</small></ResourceField>
          </span>
          <span className="resource-state"><StatusIndicator state={device.activeState === "active" ? "online" : device.activeState === "failed" ? "offline" : "pending"}>{stateLabels[device.activeState] ?? device.activeState}</StatusIndicator><ChevronRight aria-hidden="true" /></span>
        </Link>
      </ResourceListItem>)}
    </ResourceList>
    <ResourceNote icon={Cpu} title="Uma interface para cada dispositivo">Abra um dispositivo para explorar sua telemetria e os comandos declarados. O estado acima representa a ativação no gateway; a presença na rede aparece em Discovery.</ResourceNote>
  </>;
}
