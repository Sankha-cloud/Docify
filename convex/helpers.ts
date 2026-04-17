import { Doc, Id } from "./_generated/dataModel";
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

export function normalizeEmail(email: string | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

export async function getAccessEntryByEmail(
  ctx: QueryCtx | MutationCtx,
  documentId: Id<"documents">,
  email: string,
) {
  return await ctx.db
    .query("documentAccess")
    .withIndex("by_documentId_and_email", (q) =>
      q.eq("documentId", documentId).eq("email", email),
    )
    .unique();
}

export async function getDocumentForRead(
  ctx: QueryCtx | MutationCtx,
  documentId: Id<"documents">,
): Promise<{
  doc: Doc<"documents">;
  isOwner: boolean;
  role: "editor" | "viewer" | null;
}> {
  const identity = await requireIdentity(ctx);
  const doc = await ctx.db.get(documentId);
  if (!doc || doc.deletedAt !== undefined) {
    throw new Error("Document not found");
  }
  const isOwner = doc.ownerId === identity.tokenIdentifier;
  if (isOwner) return { doc, isOwner: true, role: null };

  const email = normalizeEmail(identity.email);
  if (!email) throw new Error("Access denied");
  const access = await getAccessEntryByEmail(ctx, documentId, email);
  if (!access) throw new Error("Access denied");
  return { doc, isOwner: false, role: access.role };
}

export async function requireEditAccess(
  ctx: MutationCtx,
  documentId: Id<"documents">,
) {
  const { doc, isOwner, role } = await getDocumentForRead(ctx, documentId);
  if (!isOwner && role !== "editor") {
    throw new Error("Edit access required");
  }
  return doc;
}

export async function requireOwner(
  ctx: MutationCtx,
  documentId: Id<"documents">,
) {
  const identity = await requireIdentity(ctx);
  const doc = await ctx.db.get(documentId);
  if (!doc) throw new Error("Document not found");
  if (doc.ownerId !== identity.tokenIdentifier) {
    throw new Error("Owner access required");
  }
  return { doc, identity };
}
