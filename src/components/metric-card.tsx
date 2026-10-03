import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MetricCard({ icon: Icon, label, value, note, loading = false, children }: {
  icon: LucideIcon; label: string; value: ReactNode; note: ReactNode; loading?: boolean; children?: ReactNode;
}) {
  return <Card className="h-full min-w-0">
    <CardContent className="flex h-full flex-col gap-4">
      <dl>
        <dt className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          {label}<Icon className="size-4 shrink-0" aria-hidden="true" />
        </dt>
        <dd className="mt-5 break-words text-3xl font-medium tracking-tight tabular-nums">
          {loading ? <Skeleton className="h-9 w-20" aria-label={`Carregando ${label}`} /> : value}
        </dd>
      </dl>
      {children}
      <p className="mt-auto text-sm leading-6 text-muted-foreground">{note}</p>
    </CardContent>
  </Card>;
}
