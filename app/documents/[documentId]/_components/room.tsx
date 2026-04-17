"use client";

import { ReactNode } from "react";
import { ClientSideSuspense } from "@liveblocks/react";
import { RoomProvider } from "@/app/_lib/liveblocks";
import { Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type Props = {
  documentId: Id<"documents">;
  children: ReactNode;
};

export function Room({ documentId, children }: Props) {
  const roomId = `document-${documentId}`;
  return (
    <RoomProvider id={roomId}>
      <ClientSideSuspense
        fallback={
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </main>
        }
      >
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
