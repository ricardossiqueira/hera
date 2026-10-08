import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { Toaster } from "@/components/ui/sonner";
import "./styles.css";

if (import.meta.env.DEV) document.title = "Hera - DEV";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>,
);
