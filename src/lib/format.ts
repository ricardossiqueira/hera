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

/** "93784" (seconds) -> "1d 2h 3min". Drops leading zero units. */
export function formatUptime(seconds?: number) {
  if (seconds === undefined || Number.isNaN(seconds)) return "Não informado";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const parts = [days ? days + "d" : "", hours ? hours + "h" : "", minutes + "min"].filter(Boolean);
  return parts.join(" ");
}
