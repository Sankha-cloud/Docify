"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DesktopWarning() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 border-b bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <span className="flex-1">
        DocFlow works best on desktop. Some features are limited on small screens.
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
