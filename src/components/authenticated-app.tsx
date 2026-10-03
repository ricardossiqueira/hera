import { AppShell } from "@/components/app-shell";
import { HeraProvider } from "@/context/hera-context";
import { useCredentials } from "@/hooks/use-credentials";
import { Login } from "@/pages/login";

/** Every operational route shares this gate; public pages never start polling. */
export function AuthenticatedApp() {
  const credentials = useCredentials();
  if (!credentials) return <Login />;

  return (
    <HeraProvider>
      <AppShell />
    </HeraProvider>
  );
}
