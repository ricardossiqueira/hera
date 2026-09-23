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
