import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router";

export function App() {
  // The router owns the public landing and the authenticated app layout.
  return <RouterProvider router={router} />;
}
