import { Activity, Clock, Cpu, HardDrive, MemoryStick, Thermometer, type LucideIcon } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { Progress } from "@/components/ui/progress";
import { formatUptime } from "@/lib/format";

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const loadFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function numberField(fields: Record<string, unknown>, key: string, min = 0, max = Infinity) {
  const value = fields[key];
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

function Metric({ icon: Icon, label, value, note, percent }: { icon: LucideIcon; label: string; value: string; note: string; percent?: number }) {
  return <MetricCard icon={Icon} label={label} value={value} note={note}>
    {percent !== undefined ? <Progress value={percent} aria-label={`${label}: ${decimal.format(percent)}%`} className="h-1" /> : null}
  </MetricCard>;
}

export function OrangePiMetrics({ fields }: { fields: Record<string, unknown> }) {
  const cpu = numberField(fields, "cpu_pct", 0, 100);
  const disk = numberField(fields, "disk_used_pct", 0, 100);
  const memoryTotal = numberField(fields, "memory_total_mb");
  const memoryUsed = numberField(fields, "memory_used_mb", 0, memoryTotal && memoryTotal > 0 ? memoryTotal : Infinity);
  const memoryPercent = memoryUsed !== undefined && memoryTotal !== undefined && memoryTotal > 0 ? memoryUsed / memoryTotal * 100 : undefined;
  const temperature = numberField(fields, "temperature_c", -Infinity);
  const load = numberField(fields, "load_1");
  const uptime = numberField(fields, "uptime_s");
  const percent = (value?: number) => value === undefined ? "—" : `${decimal.format(value)}%`;
  const mb = (value?: number) => value === undefined ? "—" : decimal.format(value);

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <Metric icon={Cpu} label="CPU" value={percent(cpu)} percent={cpu} note="Utilização do processador" />
    <Metric icon={MemoryStick} label="Memória" value={percent(memoryPercent)} percent={memoryPercent} note={`${mb(memoryUsed)} / ${mb(memoryTotal)} MB em uso`} />
    <Metric icon={HardDrive} label="Disco" value={percent(disk)} percent={disk} note="Espaço ocupado" />
    <Metric icon={Thermometer} label="Temperatura" value={temperature === undefined ? "—" : `${decimal.format(temperature)} °C`} note="Temperatura do processador" />
    <Metric icon={Activity} label="Carga média" value={load === undefined ? "—" : loadFormat.format(load)} note="Média no último minuto" />
    <Metric icon={Clock} label="Tempo ligado" value={uptime === undefined ? "—" : formatUptime(uptime)} note="Desde a última inicialização do Orange Pi" />
  </div>;
}
