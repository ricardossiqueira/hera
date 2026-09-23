import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Issue } from "@/context/gateway-context";
import { formatDate } from "@/lib/format";

/** Header bell: surfaces the `issues` history that used to be tracked but never rendered. */
export function IssuesPopover({ issues }: { issues: Issue[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const unseen = Math.max(0, issues.length - seen);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSeen(issues.length);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Erros recentes" className="relative">
          <Bell />
          {unseen > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {unseen > 9 ? "9+" : unseen}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-medium">Erros recentes</p>
        {issues.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum erro registrado nesta sessão.</p>
        ) : (
          <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
            {issues.map((issue) => (
              <li key={issue.id} className="rounded-md border border-border bg-muted/40 p-2 text-sm">
                <p className="text-foreground">{issue.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(issue.at.toISOString())}</p>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
