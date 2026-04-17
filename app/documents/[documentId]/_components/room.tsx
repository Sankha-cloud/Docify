"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react";
import { Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type Props = {
  documentId: Id<"documents">;
  children: ReactNode;
};

// LiveblocksProvider installs the global Liveblocks React context that
// @liveblocks/react-tiptap's useLiveblocksExtension (and every other
// @liveblocks/react hook) reads from. The earlier createRoomContext wrapper
// created a *scoped* context that the tiptap extension couldn't see, so
// collaborative edits never synced — everything typed in one browser stayed
// local. Use the official top-level pattern.
export function Room({ documentId, children }: Props) {
  const roomId = `document-${documentId}`;
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
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
    </LiveblocksProvider>
  );
}
