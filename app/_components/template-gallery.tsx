"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import {
  extractTopNodes,
  nodeText,
} from "./template-preview-helpers";

function TemplatePreview({ content }: { content: string }) {
  const nodes = extractTopNodes(content).slice(0, 8);
  if (nodes.length === 0 || (nodes.length === 1 && !nodeText(nodes[0]))) {
    // Blank template — render a sparse sheet with a few muted lines.
    return (
      <div className="flex h-full flex-col gap-2 p-4">
        <div className="h-2 w-2/3 rounded bg-muted" />
        <div className="h-1.5 w-full rounded bg-muted/60" />
        <div className="h-1.5 w-5/6 rounded bg-muted/60" />
        <div className="h-1.5 w-4/6 rounded bg-muted/60" />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-1.5 p-4 text-foreground/80">
      {nodes.map((n, i) => {
        const text = nodeText(n);
        if (!text) {
          return <div key={i} className="h-1.5 w-3/4 rounded bg-muted/50" />;
        }
        if (n.type === "heading") {
          const level = (n.attrs?.level as number | undefined) ?? 1;
          const cls =
            level === 1
              ? "text-[10px] font-bold leading-tight"
              : level === 2
                ? "text-[9px] font-semibold leading-tight"
                : "text-[8px] font-semibold leading-tight";
          return (
            <div key={i} className={`${cls} truncate`}>
              {text}
            </div>
          );
        }
        return (
          <div
            key={i}
            className="text-[7px] leading-snug text-muted-foreground line-clamp-2"
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}

export function TemplateGallery() {
  const templates = useQuery(api.templates.list);
  const createFromTemplate = useMutation(api.documents.createFromTemplate);
  const router = useRouter();
  const [pendingId, setPendingId] = useState<Id<"templates"> | null>(null);

  // App Router keeps this component mounted when the user navigates forward
  // and back (client-side cache), so local pendingId state persists across
  // that round-trip. Clear it on remount so stale loaders don't linger.
  useEffect(() => {
    setPendingId(null);
  }, []);

  const handleCreate = async (templateId: Id<"templates">) => {
    setPendingId(templateId);
    try {
      const newId = await createFromTemplate({ templateId });
      router.push(`/documents/${newId}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create document"));
    } finally {
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
          : templates.map((t) => {
              const isPending = pendingId === t._id;
              return (
                <button
                  key={t._id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleCreate(t._id)}
                  className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-lg border bg-card text-left shadow-sm transition hover:border-primary hover:shadow-md disabled:opacity-60"
                >
                  <div className="relative flex-1 overflow-hidden bg-background">
                    {t.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.thumbnailUrl}
                        alt={t.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <TemplatePreview content={t.content} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 border-t bg-card px-3 py-2">
                    <FileText className="size-4 text-muted-foreground group-hover:text-primary" />
                    <span className="truncate text-xs font-medium">
                      {t.name}
                    </span>
                  </div>
                  {isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2 className="size-6 animate-spin" />
                    </div>
                  )}
                </button>
              );
            })}
      </div>
    </section>
  );
}
