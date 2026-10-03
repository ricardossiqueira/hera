import { useId, type ReactNode } from "react";

export function PageSection({ title, description, action, children }: {
  title: string; description?: string; action?: ReactNode; children: ReactNode;
}) {
  const id = useId();
  return <section aria-labelledby={id} className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id={id} className="text-xl font-medium tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
    {children}
  </section>;
}
