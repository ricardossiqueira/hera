import { Gauge, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TelemetryCard, isTheiaDevice } from "@/components/telemetry-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHera } from "@/context/hera-context";
import "./theia-monitor.css";

export function TheiaMonitor({ expanded, collapsible, compact, onToggle }: {
  expanded: boolean; collapsible: boolean; compact: boolean; onToggle: () => void;
}) {
  const { telemetry } = useHera();
  const monitors = telemetry.data?.filter(({ device }) => isTheiaDevice(device)) ?? [];
  const singleMonitor = monitors.length === 1 ? monitors[0].device : undefined;
  return <aside className={`theia-monitor${expanded ? " is-expanded" : ""}`} aria-label="Monitor Theia">
    <div className="theia-monitor-heading">
      {expanded || compact ? <div><h2><Gauge aria-hidden="true" />{singleMonitor ? <Link to="/devices/$deviceId" params={{ deviceId: singleMonitor.deviceId }} aria-label={`Ver dispositivo do monitor Theia: ${singleMonitor.deviceId}`} className="hover:underline">Theia</Link> : "Theia"}</h2><p>Monitor do sistema · atualização a cada 10s</p></div> : null}
      {collapsible ? <Button variant="ghost" className="theia-toggle" onClick={onToggle} aria-expanded={expanded} aria-controls="theia-monitor-content" aria-label={expanded ? "Recolher monitor Theia" : "Expandir monitor Theia"}>
        {expanded ? <PanelRightClose /> : <><PanelRightOpen /><span>Theia</span></>}
      </Button> : null}
    </div>
    <div id="theia-monitor-content" hidden={!expanded}>
      {telemetry.loading && !telemetry.data ? <Skeleton className="m-5 h-48" aria-label="Carregando monitor Theia" /> : null}
      {telemetry.error && !monitors.length ? <p role="alert" className="theia-message text-destructive">Não foi possível atualizar o monitor: {telemetry.error}</p> : null}
      {!telemetry.loading && !telemetry.error && !monitors.length ? <p className="theia-message text-muted-foreground">Nenhum monitor Theia disponível. Registre um dispositivo Orange Pi com telemetria para acompanhar o sistema.</p> : null}
      {monitors.map(({ device }) => <TelemetryCard key={device.deviceId} deviceId={device.deviceId} showDeviceLink dashboard compact showHeader={!singleMonitor} />)}
    </div>
  </aside>;
}
