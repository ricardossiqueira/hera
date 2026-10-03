import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusIndicator({ state, children }: {
  state: "online" | "offline" | "pending"; children: ReactNode;
}) {
  return <span className="inline-flex items-center gap-2 text-sm font-medium">
    <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", {
      "bg-success shadow-[0_0_8px_var(--success)]": state === "online",
      "bg-destructive": state === "offline",
      "bg-muted-foreground": state === "pending",
    })} />
    {children}
  </span>;
}
