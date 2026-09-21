import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { createRootRoute, createRoute, createRouter, Link, Outlet, RouterProvider, useParams } from "@tanstack/react-router";
import { type Device, type GatewayStatus, GatewayApiError, getGatewayApiBaseUrl, getStatus, listDeviceCommands, listDevices, publishSetLed } from "./api/gateway";
import { type Credentials, clearCredentials, getCredentials, setCredentials, subscribeCredentials } from "./api/auth";
import "./styles.css";

/** Re-renders whenever ./api/auth's in-memory credential changes (login, logout, or a 401 dropping it). */
function useCredentials(): Credentials | undefined {
  return useSyncExternalStore(subscribeCredentials, getCredentials);
}

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!username || !password) return;
    setCredentials(username, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-white">gateway-web</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Informe a credencial HTTP Basic do gateway. Ela fica somente em
          memória nesta aba - não é salva, e você precisará informá-la de
          novo após recarregar a página.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            autoFocus
            placeholder="Usuário"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
          />
          <Button type="submit">
            <span className="w-full text-center">Entrar</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}

type Resource<T> = { data?: T; error?: string; loading: boolean; updatedAt?: Date };
type Toast = { kind: "success" | "error"; message: string } | undefined;

type GatewayContextValue = {
  status: Resource<GatewayStatus>;
  devices: Resource<Device[]>;
  refreshStatus: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  reportError: (message: string) => void;
};

const GatewayContext = createContext<GatewayContextValue | undefined>(undefined);

function useResource<T>(loader: () => Promise<T>) {
  const [resource, setResource] = useState<Resource<T>>({ loading: true });
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setResource((current) => ({ ...current, loading: current.data === undefined, error: undefined }));
    try {
      const data = await loader();
      setResource({ data, loading: false, updatedAt: new Date() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado.";
      setResource((current) => ({ ...current, loading: false, error: message }));
    } finally {
      running.current = false;
    }
  }, [loader]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return [resource, refresh] as const;
}

function useGateway() {
  const value = useContext(GatewayContext);
  if (!value) throw new Error("Contexto do gateway não disponível.");
  return value;
}

function useDeviceCommands(deviceId?: string) {
  const [resource, setResource] = useState<Resource<string[]>>({ loading: false });

  useEffect(() => {
    if (!deviceId) {
      setResource({ loading: false });
      return;
    }

    let active = true;
    setResource({ loading: true });
    void listDeviceCommands(deviceId)
      .then((response) => {
        if (active) setResource({ data: response.commands.map((command) => command.type), loading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResource({
          loading: false,
          error: error instanceof Error ? error.message : "Erro inesperado ao consultar comandos.",
        });
      });

    return () => { active = false; };
  }, [deviceId]);

  return resource;
}

function formatNumber(value: string | number | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

function formatDate(value?: string) {
  if (!value) return "Não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Button({ children, onClick, disabled = false, variant = "default", type = "button" }: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "danger" | "ghost";
  type?: "button" | "submit";
}) {
  return <button type={type} className={"button button-" + variant} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={"card " + className}>{children}</section>;
}

function Heading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p></div>{action}</div>;
}

function Shell() {
  const [status, refreshStatus] = useResource(getStatus);
  const [devices, refreshDevices] = useResource(listDevices);
  const [issues, setIssues] = useState<string[]>([]);
  const reportError = useCallback((message: string) => setIssues((current) => [message, ...current].slice(0, 20)), []);

  useEffect(() => { if (status.error) reportError("Status: " + status.error); }, [reportError, status.error]);
  useEffect(() => { if (devices.error) reportError("Dispositivos: " + devices.error); }, [devices.error, reportError]);

  const online = Boolean(status.data && !status.error);
  const value = { status, devices, refreshStatus, refreshDevices, reportError };

  return <GatewayContext.Provider value={value}>
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight text-white">gateway-web</Link>
          <div className="flex items-center gap-3">
            <div className={online ? "status status-online" : "status status-offline"}><span className="status-dot" />{online ? "Gateway online" : "Gateway offline"}</div>
            <Button variant="ghost" onClick={() => clearCredentials()}>Sair</Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          <Link to="/" className="nav-link" activeProps={{ className: "nav-link nav-active" }}>Visão geral</Link>
          <Link to="/devices" className="nav-link" activeProps={{ className: "nav-link nav-active" }}>Dispositivos</Link>
          <Link to="/queue" className="nav-link" activeProps={{ className: "nav-link nav-active" }}>Fila</Link>
          <Link to="/diagnostics" className="nav-link" activeProps={{ className: "nav-link nav-active" }}>Diagnóstico</Link>
          <Link to="/settings" className="nav-link" activeProps={{ className: "nav-link nav-active" }}>Configurações</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Outlet /></main>
      {issues.length > 0 ? <span className="hidden">{issues.length}</span> : null}
    </div>
  </GatewayContext.Provider>;
}

function Overview() {
  const { status, refreshStatus } = useGateway();
  const data = status.data;

  return <><Heading title="Visão geral" description="Estado operacional atual do gateway. A página atualiza automaticamente a cada 10 segundos." action={<Button onClick={() => void refreshStatus()}>Atualizar agora</Button>} />
    {status.loading && !data ? <Card>Carregando status do gateway…</Card> : null}
    {status.error && !data ? <Card><p className="font-medium text-rose-200">Não foi possível carregar o status.</p><p className="mt-1 text-sm text-rose-300">{status.error}</p></Card> : null}
    {data ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card><p className="text-sm text-slate-400">API</p><p className="mt-2 text-2xl font-semibold text-emerald-300">Online</p><p className="mt-2 text-xs text-slate-500">A API respondeu à última consulta.</p></Card>
      <Card><p className="text-sm text-slate-400">MQTT</p><p className="mt-2 text-2xl font-semibold text-white">{data.mqttConnected ? "Conectado" : "Desconectado"}</p><p className="mt-2 text-xs text-slate-500">{data.subscriptions} subscriptions ativas</p></Card>
      <Card><p className="text-sm text-slate-400">Mensagens aceitas</p><p className="mt-2 text-2xl font-semibold text-white">{formatNumber(data.acceptedMessages)}</p><p className="mt-2 text-xs text-slate-500">Rejeitadas: {formatNumber(data.rejectedMessages)}</p></Card>
      <Card><p className="text-sm text-slate-400">Outbox armazenada</p><p className="mt-2 text-2xl font-semibold text-white">{formatNumber(data.outboxStored)}</p><p className="mt-2 text-xs text-slate-500">Descartadas: {formatNumber(data.outboxDiscarded)}</p></Card>
    </div>
    <Card className="mt-4"><h2 className="font-medium text-white">Detalhes do runtime</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><dt>Iniciado em</dt><dd>{formatDate(data.startedAt)}</dd></div><div><dt>Rotas locais publicadas</dt><dd>{formatNumber(data.localRoutesPublished)}</dd></div><div><dt>Falhas em rotas locais</dt><dd>{formatNumber(data.localRoutesFailed)}</dd></div><div><dt>Falhas na outbox</dt><dd>{formatNumber(data.outboxFailed)}</dd></div><div><dt>Gateway iniciado</dt><dd>{data.started ? "Sim" : "Não"}</dd></div></dl></Card></> : null}
  </>;
}

function Devices() {
  const { devices, refreshDevices, reportError } = useGateway();
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<Toast>();

  const leds = (devices.data ?? []).filter((device) => device.profile === "led.v1" && device.enabled && device.topics?.command);
  const toggleSelected = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const sendBatch = async (on: boolean) => {
    if (!selected.length) return;
    setSending(true);
    const results = await Promise.allSettled(selected.map((id) => publishSetLed(id, on)));
    setSending(false);
    const sent = results.filter((result) => result.status === "fulfilled").length;
    if (sent !== selected.length) reportError("Um ou mais comandos em lote falharam.");
    setToast(sent === selected.length ? { kind: "success", message: sent + " comando(s) enviado(s) ao MQTT." } : { kind: "error", message: sent + " de " + selected.length + " comando(s) foram enviados." });
  };

  return <><Heading title="Dispositivos" description="Configuração declarada no gateway. A tela não infere se um ESP32 está online." action={<Button onClick={() => void refreshDevices()}>Atualizar agora</Button>} />
    {toast ? <div className={"mb-4 rounded-xl border p-3 text-sm " + (toast.kind === "success" ? "border-emerald-900 bg-emerald-950/40 text-emerald-200" : "border-rose-900 bg-rose-950/40 text-rose-200")}>{toast.message}</div> : null}
    {leds.length ? <Card className="mb-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-white">Controle em lote</p><p className="text-sm text-slate-400">{selected.length} LED(s) selecionado(s)</p></div><div className="flex gap-2"><Button disabled={!selected.length || sending} onClick={() => void sendBatch(true)}>Ligar selecionados</Button><Button disabled={!selected.length || sending} variant="ghost" onClick={() => void sendBatch(false)}>Desligar selecionados</Button></div></div></Card> : null}
    {devices.loading && !devices.data ? <Card>Carregando dispositivos…</Card> : null}
    {devices.error && !devices.data ? <Card><p className="text-rose-200">Não foi possível carregar dispositivos.</p><p className="mt-1 text-sm text-rose-300">{devices.error}</p></Card> : null}
    {devices.data ? <Card className="overflow-x-auto p-0"><table><thead><tr><th>LED</th><th>ID</th><th>Tipo</th><th>Profile</th><th>Habilitado</th><th>Tópicos</th></tr></thead><tbody>{devices.data.map((device) => <tr key={device.id}><td>{device.profile === "led.v1" && device.enabled && device.topics?.command ? <input aria-label={"Selecionar " + device.id} type="checkbox" checked={selected.includes(device.id)} onChange={() => toggleSelected(device.id)} /> : null}</td><td><Link to="/devices/$deviceId" params={{ deviceId: device.id }} className="font-medium text-cyan-300 hover:text-cyan-200">{device.id}</Link></td><td>{device.type}</td><td>{device.profile || "—"}</td><td>{device.enabled ? "Sim" : "Não"}</td><td>{Object.values(device.topics ?? {}).filter(Boolean).length}</td></tr>)}</tbody></table></Card> : null}
  </>;
}

function DeviceDetail() {
  const { deviceId } = useParams({ from: "/devices/$deviceId" });
  const { devices, reportError } = useGateway();
  const device = devices.data?.find((item) => item.id === deviceId);
  const commands = useDeviceCommands(device?.profile === "led.v1" ? device.id : undefined);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<Toast>();

  if (devices.loading && !devices.data) return <Card>Carregando dispositivo…</Card>;
  if (!device) return <Card><p className="text-rose-200">Dispositivo não encontrado na configuração atual.</p><Link to="/devices" className="mt-3 inline-block text-cyan-300">Voltar para dispositivos</Link></Card>;

  const send = async (on: boolean) => {
    setSending(true);
    try {
      await publishSetLed(device.id, on);
      setToast({ kind: "success", message: "Comando enviado ao MQTT." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar o comando.";
      reportError("Comando " + device.id + ": " + message);
      setToast({ kind: "error", message });
    } finally {
      setSending(false);
    }
  };

  return <><Heading title={device.id} description="Detalhes de configuração e comandos disponíveis." action={<Link to="/devices" className="button button-ghost">Voltar</Link>} />
    {toast ? <div className={"mb-4 rounded-xl border p-3 text-sm " + (toast.kind === "success" ? "border-emerald-900 bg-emerald-950/40 text-emerald-200" : "border-rose-900 bg-rose-950/40 text-rose-200")}>{toast.message}</div> : null}
    <div className="grid gap-4 lg:grid-cols-2"><Card><h2 className="font-medium text-white">Configuração</h2><dl className="mt-4 grid gap-4 text-sm"><div><dt>Tipo</dt><dd>{device.type}</dd></div><div><dt>Profile</dt><dd>{device.profile || "Não definido"}</dd></div><div><dt>Habilitado</dt><dd>{device.enabled ? "Sim" : "Não"}</dd></div><div><dt>Tópico de comando</dt><dd className="break-all">{device.topics?.command || "Não configurado"}</dd></div></dl></Card>
      <Card><h2 className="font-medium text-white">Comandos</h2>{commands.loading ? <p className="mt-4 text-sm text-slate-400">Verificando comandos declarados pelo gateway…</p> : commands.error ? <p className="mt-4 text-sm text-rose-300">Não foi possível verificar os comandos: {commands.error}</p> : device.enabled && device.topics?.command && commands.data?.includes("set_led") ? <div className="mt-4"><p className="text-sm leading-6 text-slate-400">O gateway confirma apenas a publicação no MQTT; este controle não confirma execução no ESP32.</p><div className="mt-5 flex flex-wrap gap-3"><Button disabled={sending} onClick={() => void send(true)}>Ligar LED</Button><Button disabled={sending} variant="ghost" onClick={() => void send(false)}>Desligar LED</Button></div></div> : <p className="mt-4 text-sm text-slate-400">Este dispositivo não declarou um comando compatível nesta interface.</p>}</Card></div>
  </>;
}

function Queue() {
  return <><Heading title="Fila" description="A observabilidade detalhada da outbox ainda será exposta por uma API futura." /><Card><h2 className="font-medium text-white">Ainda não disponível</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">A API atual fornece somente contadores globais. Ela não expõe itens, payloads, falhas por device ou histórico consultável, então esta tela não inventa dados.</p><Link to="/" className="mt-4 inline-block text-sm font-medium text-cyan-300">Ver contadores globais na visão geral</Link></Card></>;
}

function Diagnostics() {
  const { status, devices, refreshStatus, refreshDevices } = useGateway();
  return <><Heading title="Diagnóstico" description="Informações técnicas da sessão atual e erros de conectividade." action={<div className="flex gap-2"><Button onClick={() => void refreshStatus()}>Atualizar status</Button><Button variant="ghost" onClick={() => void refreshDevices()}>Atualizar devices</Button></div>} />
    <div className="grid gap-4 lg:grid-cols-2"><Card><h2 className="font-medium text-white">Status da API</h2><p className="mt-3 text-sm text-slate-400">{status.error ?? (status.data ? "Última resposta em " + formatDate(status.updatedAt?.toISOString()) : "Aguardando primeira resposta.")}</p></Card><Card><h2 className="font-medium text-white">Lista de dispositivos</h2><p className="mt-3 text-sm text-slate-400">{devices.error ?? (devices.data ? devices.data.length + " dispositivo(s) na última resposta." : "Aguardando primeira resposta.")}</p></Card></div></>;
}

function Settings() {
  const baseUrl = getGatewayApiBaseUrl();
  return <><Heading title="Configurações" description="Esta versão recebe a URL da API apenas pelo ambiente de execução." /><Card><h2 className="font-medium text-white">API do gateway</h2><p className="mt-3 break-all font-mono text-sm text-cyan-200">{baseUrl || "VITE_GATEWAY_API_BASE_URL não configurada"}</p><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">Para alterar o destino, atualize VITE_GATEWAY_API_BASE_URL em .env.local e reinicie o servidor Vite. Não coloque credenciais em variáveis VITE_*.</p></Card></>;
}

const rootRoute = createRootRoute({ component: Shell });
const overviewRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Overview });
const devicesRoute = createRoute({ getParentRoute: () => rootRoute, path: "devices", component: Devices });
const detailRoute = createRoute({ getParentRoute: () => devicesRoute, path: "$deviceId", component: DeviceDetail });
const queueRoute = createRoute({ getParentRoute: () => rootRoute, path: "queue", component: Queue });
const diagnosticsRoute = createRoute({ getParentRoute: () => rootRoute, path: "diagnostics", component: Diagnostics });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: "settings", component: Settings });
const routeTree = rootRoute.addChildren([overviewRoute, devicesRoute.addChildren([detailRoute]), queueRoute, diagnosticsRoute, settingsRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  // Gated on the in-memory credential, not a route: every screen needs an
  // authenticated call sooner or later (even Overview's GetStatus), so
  // there is no unauthenticated route worth rendering behind the router.
  const credentials = useCredentials();
  return credentials ? <RouterProvider router={router} /> : <Login />;
}

createRoot(document.getElementById("root")!).render(<App />);
