// Liveblocks v3 reads shared types (Presence, Storage, UserMeta, etc.) from
// a global `Liveblocks` interface via module augmentation, rather than from
// a scoped createRoomContext wrapper. Declaring the types here makes
// useSelf(), useOthers(), and every other @liveblocks/react hook return
// strongly-typed values throughout the app.
declare global {
  interface Liveblocks {
    Presence: Record<string, never>;
    Storage: Record<string, never>;
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar?: string;
      };
    };
    RoomEvent: Record<string, never>;
    ThreadMetadata: Record<string, never>;
  }
}

export {};
