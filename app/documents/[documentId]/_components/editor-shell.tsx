"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { EditorUI } from "./editor-ui";
import { Room } from "./room";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = { documentId: Id<"documents"> };

export function EditorShell({ documentId }: Props) {
  const data = useQuery(api.documents.getById, { documentId });
  const router = useRouter();

  useEffect(() => {
    if (data === null) {
      toast.error("You do not have access to this document");
      router.replace("/");
    }
  }, [data, router]);

  if (data === undefined) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (data === null) return null;

  return (
    <Room documentId={documentId}>
      <EditorUI
        documentId={documentId}
        doc={data.doc}
        isOwner={data.isOwner}
        isEditable={data.isEditable}
      />
    </Room>
  );
}
