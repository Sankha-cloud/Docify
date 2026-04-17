import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function colorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export async function POST(request: Request) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as { room?: string };
  const room = body.room;
  if (!room || !room.startsWith("document-")) {
    return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  }
  const documentId = room.replace(/^document-/, "") as Id<"documents">;

  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "No Convex token" }, { status: 401 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);

  let access: Awaited<ReturnType<typeof convex.query<typeof api.documents.getById>>>;
  try {
    access = await convex.query(api.documents.getById, { documentId });
  } catch {
    return NextResponse.json({ error: "Access check failed" }, { status: 500 });
  }
  if (!access) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  const user = await currentUser();
  const name =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses[0]?.emailAddress ||
    "Someone";
  const avatar = user?.imageUrl;

  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name,
      color: colorForUser(userId),
      avatar,
    },
  });

  if (access.isEditable) {
    session.allow(room, session.FULL_ACCESS);
  } else {
    session.allow(room, session.READ_ACCESS);
  }

  const { status, body: authBody } = await session.authorize();
  return new NextResponse(authBody, { status });
}
