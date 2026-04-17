"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

type Presence = Record<string, never>;
type Storage = Record<string, never>;
export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar?: string;
  };
};

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

export const {
  RoomProvider,
  useOthers,
  useSelf,
  useRoom,
} = createRoomContext<Presence, Storage, UserMeta>(client);
