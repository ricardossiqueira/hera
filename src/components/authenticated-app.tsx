import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { HeraProvider } from "@/context/hera-context";
import { restoreSession } from "@/api/auth";
import { useAuth } from "@/hooks/use-auth";
import { Login } from "@/pages/login";

/** Every operational route shares this gate; public pages never start polling. */
export function AuthenticatedApp() {
  const auth = useAuth();
  useEffect(() => { if (auth.status === "checking") void restoreSession(); }, [auth.status]);
  if (auth.status === "checking") return <div role="status" className="flex min-h-screen items-center justify-center">Verificando sessão…</div>;
  if (auth.status === "anonymous") return <Login needsRegistration={auth.needsRegistration} initialError={auth.error} />;

  return (
    <HeraProvider>
      <AppShell />
    </HeraProvider>
  );
}
