"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Segment error boundary for the force-dynamic pages. Keeps the privacy through-line
// even in the failure state — nothing left the machine.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="max-w-sm text-pretty text-sm text-muted-foreground">
          This stayed on your machine — nothing was sent anywhere. Try again, or reload the page.
        </p>
      </div>
      <Button onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
