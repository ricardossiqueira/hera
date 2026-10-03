import type { ReactNode } from "react";

export function PageHeading({ title, description, action, eyebrow }: { title: string; description: string; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div>
        {eyebrow ? <p className="mb-2 text-xs tracking-[0.12em] text-muted-foreground uppercase">{eyebrow}</p> : null}
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
