import { Link, Outlet } from "@tanstack/react-router";
import { Cpu, LayoutDashboard, ListOrdered, LogOut, Settings, Workflow } from "lucide-react";
import { clearCredentials } from "@/api/auth";
import { IssuesPopover } from "@/components/issues-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGateway } from "@/context/gateway-context";

const navItems = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard },
  { to: "/devices", label: "Dispositivos", icon: Cpu },
  { to: "/automations", label: "Automações", icon: Workflow },
  { to: "/queue", label: "Fila", icon: ListOrdered },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

const navLinkClassName = "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const navLinkActiveClassName = navLinkClassName.replace("text-muted-foreground", "bg-accent text-foreground");

export function AppShell() {
  const { status, issues } = useGateway();
  const online = Boolean(status.data && !status.error);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">gateway-web</Link>
          <div className="flex items-center gap-2">
            <Badge variant={online ? "success" : "destructive"} className="gap-1.5">
              <span className={"size-1.5 rounded-full " + (online ? "bg-success" : "bg-destructive")} />
              {online ? "Gateway online" : "Gateway offline"}
            </Badge>
            <IssuesPopover issues={issues} />
            <Button variant="ghost" size="sm" onClick={() => clearCredentials()}>
              <LogOut /> Sair
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={navLinkClassName} activeProps={{ className: navLinkActiveClassName }}>
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
