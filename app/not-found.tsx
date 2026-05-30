import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

// Global 404 boundary for notFound() (e.g. a deleted trip or an unknown country
// code). Keeps the privacy through-line even when a record isn't there.
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-6" />
      </div>
      <div className="space-y-1">
        <h1 className="font-display text-xl font-semibold text-foreground">Nothing here</h1>
        <p className="max-w-sm text-pretty text-sm text-muted-foreground">
          This page or record doesn&rsquo;t exist — it may have been deleted, or the link is wrong.
          Either way, nothing left your machine.
        </p>
      </div>
      <Button asChild variant="secondary">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
