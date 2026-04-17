"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown } from "lucide-react";
import { DocumentMenu } from "./document-menu";
import { RenameDialog } from "./rename-dialog";
import { ShareDialog } from "./share-dialog";
import { useUser } from "@clerk/nextjs";

type FilterType = "anyone" | "me" | "shared";

const FILTER_LABEL: Record<FilterType, string> = {
  anyone: "Owned by anyone",
  me: "Owned by me",
  shared: "Shared with me",
};

function formatRelative(ms: number) {
  const diff = Date.now() - ms;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ms).toLocaleDateString();
}

type Props = { search: string };

export function DocumentList({ search }: Props) {
  const [filter, setFilter] = useState<FilterType>("anyone");
  const documents = useQuery(api.documents.listByUser, { filterType: filter });
  const { user } = useUser();
  const router = useRouter();
  const ownerTokenIdentifier = useMemo(() => {
    return user?.id ? null : null;
  }, [user]);

  const [renameTarget, setRenameTarget] = useState<{
    id: Id<"documents">;
    title: string;
  } | null>(null);
  const [shareTarget, setShareTarget] = useState<Id<"documents"> | null>(null);

  const filtered = useMemo(() => {
    if (!documents) return undefined;
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.title.toLowerCase().includes(q));
  }, [documents, search]);

  const isOwner = (doc: Doc<"documents">) => {
    // Owner identity is checked server-side; we use a heuristic for UI:
    // if filter is "shared", the doc is not owned by current user.
    if (filter === "shared") return false;
    if (filter === "me") return true;
    // For "anyone", we don't know without extra info — enable actions and
    // let server enforcement reject if the user is not actually the owner.
    return true;
    void ownerTokenIdentifier;
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Recent documents
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            {FILTER_LABEL[filter]}
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(FILTER_LABEL) as FilterType[]).map((f) => (
              <DropdownMenuItem key={f} onSelect={() => setFilter(f)}>
                {FILTER_LABEL[f]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filtered === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md border bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <FileText className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-2 font-medium">No documents yet</p>
          <p className="text-sm text-muted-foreground">
            {search
              ? "No documents match your search."
              : "Pick a template above to get started."}
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {filtered.map((doc) => (
            <li
              key={doc._id}
              onClick={() => router.push(`/documents/${doc._id}`)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50"
            >
              <FileText className="size-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">{doc.title}</div>
                <div className="text-xs text-muted-foreground">
                  Updated {formatRelative(doc.updatedAt)}
                </div>
              </div>
              <DocumentMenu
                documentId={doc._id}
                isOwner={isOwner(doc)}
                onRename={() =>
                  setRenameTarget({ id: doc._id, title: doc.title })
                }
                onShare={() => setShareTarget(doc._id)}
              />
            </li>
          ))}
        </ul>
      )}

      <RenameDialog
        documentId={renameTarget?.id ?? null}
        currentTitle={renameTarget?.title ?? ""}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      />
      <ShareDialog
        documentId={shareTarget}
        onOpenChange={(open) => !open && setShareTarget(null)}
      />
    </section>
  );
}
