"use client";

import { Check, Cloud, Loader2 } from "lucide-react";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === "saving" || status === "dirty") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving...
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="size-3" />
        Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        Save failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Cloud className="size-3" />
      Up to date
    </span>
  );
}
