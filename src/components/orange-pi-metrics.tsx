import { Activity, Clock, Cpu, HardDrive, MemoryStick, Thermometer, type LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatUptime } from "@/lib/format";

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const loadFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function numberField(fields: Record<string, unknown>, key: string, min = 0, max = Infinity) {
  const value = fields[key];
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : undefined;
}

function Metric({ icon: Icon, label, value, note, percent }: { icon: LucideIcon; label: string; value: string; note: string; percent?: number }) {
  return <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-background/50 p-4">
    <dt className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4" aria-hidden="true" />{label}</dt>
    <dd className="flex flex-1 flex-col gap-3">
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      {percent !== undefined ? <Progress value={percent} aria-label={`${label}: ${decimal.format(percent)}%`} className="h-1.5" /> : null}
      <span className="mt-auto text-xs text-muted-foreground">{note}</span>
    </dd>
  </div>;
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

  return <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <Metric icon={Cpu} label="CPU" value={percent(cpu)} percent={cpu} note="Utilização do processador" />
    <Metric icon={MemoryStick} label="Memória" value={percent(memoryPercent)} percent={memoryPercent} note={`${mb(memoryUsed)} / ${mb(memoryTotal)} MB em uso`} />
    <Metric icon={HardDrive} label="Disco" value={percent(disk)} percent={disk} note="Espaço ocupado" />
    <Metric icon={Thermometer} label="Temperatura" value={temperature === undefined ? "—" : `${decimal.format(temperature)} °C`} note="Temperatura do processador" />
    <Metric icon={Activity} label="Carga média" value={load === undefined ? "—" : loadFormat.format(load)} note="Média no último minuto" />
    <Metric icon={Clock} label="Tempo ligado" value={uptime === undefined ? "—" : formatUptime(uptime)} note="Desde a última inicialização do Orange Pi" />
  </dl>;
}
