import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper, rowPaginationFeature, tableFeatures, useTable } from "@tanstack/react-table";
import { Activity, ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react";
import { getRecentEvents, type GatewayEvent } from "@/api/gateway";
import { queryKeys } from "@/api/queries";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHera } from "@/context/hera-context";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";

const PAGE_SIZE = 15;
const ALL_DEVICES = "all";

// 0 means no lower time bound ("Tudo") - getRecentEvents omits `since`.
const TIME_WINDOWS = [
  { value: "5", label: "Últimos 5 min" },
  { value: "15", label: "Últimos 15 min" },
  { value: "60", label: "Última hora" },
  { value: "0", label: "Tudo" },
] as const;

const outcomeLabel: Record<GatewayEvent["outcome"], string> = {
  accepted: "Aceita",
  rejected: "Rejeitada",
  v2_rule_fired: "Automação disparada",
};

function outcomeBadgeVariant(outcome: GatewayEvent["outcome"]) {
  return outcome === "rejected" ? "destructive" : "success";
}

const emptyEvents: GatewayEvent[] = [];
const features = tableFeatures({ rowPaginationFeature });
const column = createColumnHelper<typeof features, GatewayEvent>();
const eventColumns = column.columns([
  column.accessor("timestamp", { header: "Hora", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.timestamp)}</span> }),
  column.accessor("deviceId", { header: "Device", cell: ({ row }) => <span className="font-medium">{row.original.deviceId || "—"}</span> }),
  column.accessor("kind", { header: "Kind", cell: ({ row }) => <span className="text-muted-foreground">{row.original.kind || "—"}</span> }),
  column.accessor("outcome", { header: "Resultado", cell: ({ row }) => <Badge variant={outcomeBadgeVariant(row.original.outcome)}>{outcomeLabel[row.original.outcome]}</Badge> }),
  column.accessor("detail", { header: "Detalhe", cell: ({ row }) => <span className="block max-w-xs truncate text-muted-foreground" title={row.original.detail || undefined}>{row.original.detail || "—"}</span> }),
]);

function RecentEventsCard() {
  const { devices: { data: devices = [] } } = useHera();
  const [deviceId, setDeviceId] = useState(ALL_DEVICES);
  const [windowMinutes, setWindowMinutes] = useState("15");
  // Stack of `beforeSequence` cursors already visited - top of stack is
  // the current page's cursor (undefined for page 1). Changing a filter
  // resets this, same as any table filter changing resets pagination.
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const cursor = cursorStack[cursorStack.length - 1];
  const { data: page, error, isFetching: loading, refetch } = useQuery({
    queryKey: [...queryKeys.recentEvents, { deviceId, windowMinutes, cursor, limit: PAGE_SIZE }],
    queryFn: () => {
      const minutes = Number(windowMinutes);
      const since = minutes > 0 ? new Date(Date.now() - minutes * 60_000).toISOString() : undefined;
      return getRecentEvents({
        deviceId: deviceId === ALL_DEVICES ? undefined : deviceId,
        since,
        limit: PAGE_SIZE,
        beforeSequence: cursor,
      });
    },
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
  const events = page?.events;
  const table = useTable({
    features,
    data: events ?? emptyEvents,
    columns: eventColumns,
    getRowId: (event) => event.sequence,
    manualPagination: true,
    pageCount: -1,
    state: { pagination: { pageIndex: cursorStack.length, pageSize: PAGE_SIZE } },
  });

  const changeDevice = (value: string) => { setDeviceId(value); setCursorStack([]); };
  const changeWindow = (value: string) => { setWindowMinutes(value); setCursorStack([]); };
  const nextPage = () => {
    if (!events?.length) return;
    setCursorStack((stack) => [...stack, events[events.length - 1].sequence]);
  };
  const prevPage = () => setCursorStack((stack) => stack.slice(0, -1));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2"><Activity className="size-4" /> Atividade recente</span>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={deviceId} onValueChange={changeDevice}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DEVICES}>Todos os devices</SelectItem>
                {devices.map((device) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.deviceId}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={windowMinutes} onValueChange={changeWindow}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_WINDOWS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={loading} onClick={() => void refetch({ cancelRefetch: false })}><RefreshCw /> Atualizar</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Mensagens aceitas/rejeitadas e rotas locais disparando — diferente da outbox acima, que é só o que aguarda envio à VPS.
        </p>
        {loading && !events ? <Skeleton className="h-48" /> : null}
        {error ? <p role="alert" className="text-sm text-destructive">Não foi possível atualizar a atividade recente: {error.message}</p> : null}
        {events && events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade para esse filtro.</p>
        ) : null}
        {events?.length ? (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((group) => <TableRow key={group.id}>
                  {group.headers.map((header) => <TableHead key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>)}
                </TableRow>)}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => <TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : null}
        {events || cursorStack.length > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Página {cursorStack.length + 1} · {events?.length ?? 0} evento(s) nesta página</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!table.getCanPreviousPage()} onClick={prevPage}><ChevronLeft /> Anterior</Button>
                <Button size="sm" variant="outline" disabled={loading || !page?.hasMore || !events?.length} onClick={nextPage}>Próxima <ChevronRight /></Button>
              </div>
            </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function Queue() {
  const { queueSummary, refreshQueueSummary } = useHera();
  const data = queueSummary.data;

  return (
    <>
      <PageHeading
        title="Fila"
        description="Estado atual da outbox: dados aprovados para envio futuro à VPS, pendentes agora."
        action={<Button variant="outline" onClick={() => void refreshQueueSummary()}><RefreshCw /> Atualizar</Button>}
      />
      <div className="space-y-4">
        {queueSummary.loading && !data ? <Skeleton className="h-32" /> : null}
        {queueSummary.error && !data ? (
          <Card>
            <CardContent>
              <p className="text-destructive">Não foi possível carregar o resumo da fila.</p>
              <p className="mt-1 text-sm text-destructive/80">{queueSummary.error}</p>
            </CardContent>
          </Card>
        ) : null}
        {data ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Inbox className="size-4" /> Outbox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes agora</p>
                  <p className="mt-1 text-2xl font-semibold">{formatNumber(data.pendingMessages)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tamanho ocupado</p>
                  <p className="mt-1 text-2xl font-semibold">{formatBytes(data.pendingBytes)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Item mais antigo</p>
                  <p className="mt-1 text-2xl font-semibold">{data.oldestEnqueuedAt ? formatDate(data.oldestEnqueuedAt) : "—"}</p>
                </div>
              </div>
              {data.pendingMessages === "0" ? (
                <p className="text-sm text-muted-foreground">
                  Fila vazia. Isso é esperado: a outbox só recebe dados de devices com encaminhamento para a VPS habilitado, e nenhum fluxo de cadastro liga isso hoje.
                </p>
              ) : null}
              <p className="text-sm leading-6 text-muted-foreground">
                Este resumo é o estado atual da fila (diferente dos contadores acumulados desde o início do processo, que ficam na Visão geral). A API ainda não expõe itens individuais, payloads, motivo de descarte por mensagem ou histórico consultável — esta tela não inventa esses dados.
              </p>
            </CardContent>
          </Card>
        ) : null}
        <RecentEventsCard />
      </div>
    </>
  );
}
