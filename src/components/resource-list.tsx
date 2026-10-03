import { useId, type ReactNode } from "react";
import { Search, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import "./resource-list.css";

export function SummaryStrip({ items }: { items: { label: string; value: number | undefined; note: string }[] }) {
  return <dl className="resource-summary">
    {items.map(({ label, value, note }) => <div key={label}>
      <dt>{label}</dt><dd>{value === undefined ? "—" : formatNumber(value)}<span>{note}</span></dd>
    </div>)}
  </dl>;
}

export function ResourceList({ title, searchLabel, query, onQueryChange, total, visible, loading, error, empty, children }: {
  title: string; searchLabel: string; query: string; onQueryChange: (query: string) => void;
  total: number | undefined; visible: number; loading: boolean; error?: string;
  empty: ReactNode; children: ReactNode;
}) {
  const titleId = useId();
  return <section aria-labelledby={titleId} className="resource-list">
    <div className="resource-list-heading"><h2 id={titleId}>{title}</h2><span role="status">{total === undefined ? "Aguardando dados" : `${formatNumber(visible)} de ${formatNumber(total)}`}</span></div>
    <div className="resource-search">
      <Search className="size-4" aria-hidden="true" />
      <Input type="search" aria-label={searchLabel} placeholder={searchLabel} value={query} onChange={(event) => onQueryChange(event.target.value)} />
    </div>
    {error ? <p role="alert" className="resource-error">{error}{total !== undefined ? " Exibindo a última consulta disponível." : ""}</p> : null}
    {loading && total === undefined ? <div className="space-y-4 py-6" aria-label="Carregando lista">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-20" />)}</div> : null}
    {total === 0 ? empty : null}
    {total !== undefined && total > 0 && visible === 0 ? <div className="resource-empty"><Search aria-hidden="true" /><h3>Nenhum resultado para esta busca</h3><p>Tente outro nome ou identificador.</p><Button variant="outline" onClick={() => onQueryChange("")}>Limpar busca</Button></div> : null}
    {visible > 0 ? <ul className="resource-items">{children}</ul> : null}
  </section>;
}

export function ResourceListItem({ children, flow = false }: { children: ReactNode; flow?: boolean }) {
  return <li className={`resource-item${flow ? " resource-item-flow" : ""}`}>{children}</li>;
}

export function ResourceIdentity({ icon: Icon, name, children }: { icon: LucideIcon; name: string; children: ReactNode }) {
  return <span className="resource-identity"><Icon aria-hidden="true" /><span><strong>{name}</strong><span className="resource-subtitle">{children}</span></span></span>;
}

export function ResourceField({ label, children }: { label: string; children: ReactNode }) {
  return <span className="resource-field"><span>{label}</span><span>{children}</span></span>;
}

export function ResourceNote({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return <div className="resource-note"><Icon aria-hidden="true" /><div><h2>{title}</h2><p>{children}</p></div></div>;
}

export function ResourceEmpty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="resource-empty"><Icon aria-hidden="true" /><h3>{title}</h3><p>{children}</p>{action}</div>;
}

export function matchesSearch(query: string, ...values: (string | undefined)[]) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  return normalize(values.filter(Boolean).join(" ")).includes(normalize(query.trim()));
}
