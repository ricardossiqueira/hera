export function formatNumber(value: string | number | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

export function formatDate(value?: string) {
  if (!value) return "Não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** "1536" (bytes, as number or numeric string) -> "1,5 KB". */
export function formatBytes(value?: string | number) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes < 1024) return formatNumber(bytes) + " B";
  const units = ["KB", "MB", "GB"];
  let scaled = bytes / 1024;
  let unit = 0;
  while (scaled >= 1024 && unit < units.length - 1) {
    scaled /= 1024;
    unit++;
  }
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(scaled) + " " + units[unit];
}

/** "93784" (seconds) -> "1d 2h 3min". Drops leading zero units. */
export function formatUptime(seconds?: number) {
  if (seconds === undefined || Number.isNaN(seconds)) return "Não informado";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const parts = [days ? days + "d" : "", hours ? hours + "h" : "", minutes + "min"].filter(Boolean);
  return parts.join(" ");
}
