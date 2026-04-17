"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TemplateGallery() {
  const templates = useQuery(api.templates.list);
  const createFromTemplate = useMutation(api.documents.createFromTemplate);
  const router = useRouter();
  const [pendingId, setPendingId] = useState<Id<"templates"> | null>(null);

  const handleCreate = async (templateId: Id<"templates">) => {
    setPendingId(templateId);
    try {
      const newId = await createFromTemplate({ templateId });
      router.push(`/documents/${newId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create document",
      );
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Start a new document
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {templates === undefined
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-lg border bg-muted"
              />
            ))
          : templates.map((t) => (
              <button
                key={t._id}
                type="button"
                disabled={pendingId !== null}
                onClick={() => handleCreate(t._id)}
                className="group relative aspect-[3/4] overflow-hidden rounded-lg border bg-card text-left transition hover:border-primary hover:shadow-sm disabled:opacity-60"
              >
                <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
                  <FileText className="size-10 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm font-medium text-center">
                    {t.name}
                  </span>
                </div>
                {pendingId === t._id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                )}
              </button>
            ))}
      </div>
    </section>
  );
}
