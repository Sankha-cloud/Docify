"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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
  // Distinguishes "never had access" from "access just revoked". The query
  // returns null in both cases, but we only want the error toast when the
  // doc was unreachable from the first load — trashing/unsharing flips data
  // from a value to null and the calling action already handles navigation.
  const everHadData = useRef(false);

  useEffect(() => {
    if (data) {
      everHadData.current = true;
      return;
    }
    if (data === null) {
      if (!everHadData.current) {
        toast.error("You do not have access to this document");
      }
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
