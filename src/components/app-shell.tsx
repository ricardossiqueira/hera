import { useEffect, useState, useSyncExternalStore } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Cpu, LayoutDashboard, ListOrdered, LogOut, Menu, Radar, Settings, Workflow, X } from "lucide-react";
import { clearCredentials } from "@/api/auth";
import { IssuesPopover } from "@/components/issues-popover";
import { HeraMark } from "@/components/hera-mark";
import { TheiaMonitor } from "@/components/theia-monitor";
import { StatusIndicator } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useHera } from "@/context/hera-context";
import "./app-shell.css";

const navItems = [
  { to: "/overview", label: "Visão geral", icon: LayoutDashboard },
  { to: "/devices", label: "Dispositivos", icon: Cpu },
  { to: "/discovery", label: "Discovery", icon: Radar },
  { to: "/automations", label: "Automações", icon: Workflow },
  { to: "/queue", label: "Fila", icon: ListOrdered },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

const compactMedia = "(max-width: 1199px)";
function subscribeCompact(onChange: () => void) {
  const media = window.matchMedia(compactMedia);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function isCompact() { return window.matchMedia(compactMedia).matches; }

function AppNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="Navegação principal" className="app-navigation">
    <p className="app-nav-caption">Workspace</p>
    {navItems.map(({ to, label, icon: Icon }) => (
      <Link key={to} to={to} onClick={onNavigate} activeOptions={{ exact: to === "/overview" }}
        className="app-nav-link" activeProps={{ className: "is-active", "aria-current": "page" }}>
        <Icon className="size-[18px]" aria-hidden="true" />{label}
      </Link>
    ))}
  </nav>;
}

export function AppShell() {
  const { status, issues } = useHera();
  const compact = useSyncExternalStore(subscribeCompact, isCompact);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [theiaExpanded, setTheiaExpanded] = useState(true);
  const isOverview = pathname === "/overview";
  const showTheia = (isOverview && !compact) || theiaExpanded;
  const currentPage = navItems.find(({ to }) => pathname === to || pathname.startsWith(to + "/"));
  const connection = status.error ? "offline" : status.data ? "online" : "pending";

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return <div className="hera-app">
    <a href="#app-content" className="app-skip-link">Pular para o conteúdo</a>
    <aside className="app-sidebar">
      <Link to="/overview" className="app-brand" aria-label="Hera"><HeraMark />hera.</Link>
      <AppNavigation />
      <div className="app-sidebar-footer">
        <span className="app-nav-caption">Seu espaço conectado.</span>
        <Link to="/" className="app-home-link">Conheça a Hera <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
      </div>
    </aside>
    <div className="app-workspace">
      <header className="app-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="app-menu-trigger" aria-label="Abrir navegação"><Menu /></Button>
            </DialogTrigger>
            <DialogContent className="app-mobile-menu" showCloseButton={false} aria-describedby={undefined}>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-3 text-2xl"><HeraMark />hera.</DialogTitle>
                <DialogClose asChild><Button variant="ghost" size="icon" aria-label="Fechar navegação"><X /></Button></DialogClose>
              </div>
              <AppNavigation onNavigate={() => setMenuOpen(false)} />
              <Link to="/" onClick={() => setMenuOpen(false)} className="app-home-link">Conheça a Hera <ArrowUpRight className="size-4" /></Link>
            </DialogContent>
          </Dialog>
          <span className="app-breadcrumb-root">Workspace <span aria-hidden="true">/</span></span>
          <span className="truncate text-sm">{currentPage?.label ?? "Hera"}</span>
        </div>
        <div className="app-toolbar">
          <span className="app-connection" role="status">
            <StatusIndicator state={connection}>{connection === "online" ? "Gateway online" : connection === "offline" ? "Gateway indisponível" : "Verificando gateway"}</StatusIndicator>
          </span>
          <IssuesPopover issues={issues} />
          <Button variant="ghost" size="sm" className="app-logout" onClick={() => clearCredentials()} aria-label="Sair"><LogOut /><span>Sair</span></Button>
        </div>
      </header>
      <div className={`app-body${showTheia ? " theia-expanded" : ""}`}>
        <div className="app-page">
          <main id="app-content" tabIndex={-1} className="app-content"><Outlet /></main>
          <footer className="app-footer"><span>Hera · seu espaço conectado</span><span>Dados do seu gateway</span></footer>
        </div>
        <TheiaMonitor expanded={showTheia} collapsible={!isOverview || compact} compact={compact} onToggle={() => setTheiaExpanded((current) => !current)} />
      </div>
    </div>
  </div>;
}
