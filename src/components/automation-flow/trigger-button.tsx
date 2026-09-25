import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shared by EventNode and ActionNode (detail mode): both fire the exact
// same rule action unconditionally, via the exact same publishCommand call
// CommandForm (src/pages/devices/detail.tsx) already uses for manual
// dispatch from /dispositivos - no condition/dedup/rate-limit in the way.
// The call itself (and its success/error feedback) lives once in
// detail.tsx and is passed down as onTrigger, so both nodes share one
// implementation instead of two. Only sending state is local here.
export function TriggerButton({ onTrigger, title }: {
  onTrigger?: () => Promise<void>;
  title: string;
}) {
  const [sending, setSending] = useState(false);
  if (!onTrigger) return null;

  const run = async () => {
    setSending(true);
    try {
      await onTrigger();
    } finally {
      setSending(false);
    }
  };

  return (
    <Button size="icon-sm" variant="outline" className="shrink-0" disabled={sending} onClick={() => void run()} title={title}>
      <Play />
    </Button>
  );
}
