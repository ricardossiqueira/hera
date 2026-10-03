import "./hera-mark.css";

export function HeraMark({ small = false }: { small?: boolean }) {
  return <span className={`hera-mark${small ? " hera-mark-small" : ""}`} aria-hidden="true">
    <span /><span /><span /><span /><span /><span />
  </span>;
}
