import type { ComponentProps, MouseEvent } from "react";
import { TableRow } from "@/components/ui/table";

// Keep a real link in a cell for keyboard navigation and browser link actions.
// Clicking elsewhere in the row activates that same link, without swallowing
// nested controls or text selection.
export function LinkedTableRow({ className = "", ...props }: Omit<ComponentProps<typeof TableRow>, "onClick">) {
  const activateLink = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest("a,button,input,select,textarea,label,[role=button]")) return;
    if (window.getSelection()?.toString()) return;
    const link = event.currentTarget.querySelector<HTMLAnchorElement>("a[data-row-link]");
    link?.dispatchEvent(new MouseEvent("click", {
      bubbles: true, cancelable: true,
      ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey, altKey: event.altKey,
    }));
  };
  return <TableRow {...props} onClick={activateLink} className={`cursor-pointer focus-within:bg-muted/50 ${className}`} />;
}
