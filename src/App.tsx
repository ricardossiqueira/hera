import { RouterProvider } from "@tanstack/react-router";
import { GatewayProvider } from "@/context/gateway-context";
import { useCredentials } from "@/hooks/use-credentials";
import { Login } from "@/pages/login";
import { router } from "@/router";

export function App() {
  // Gated on the in-memory credential, not a route: every screen needs an
  // authenticated call sooner or later (even Overview's GetStatus), so
  // there is no unauthenticated route worth rendering behind the router.
  const credentials = useCredentials();
  if (!credentials) return <Login />;

  return (
    <GatewayProvider>
      <RouterProvider router={router} />
    </GatewayProvider>
  );
}
