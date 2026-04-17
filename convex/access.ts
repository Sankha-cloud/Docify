import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAccessEntryByEmail,
  getDocumentForRead,
  normalizeEmail,
  requireIdentity,
  requireOwner,
} from "./helpers";

export const invite = mutation({
  args: {
    documentId: v.id("documents"),
    email: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireOwner(ctx, args.documentId);

    const email = normalizeEmail(args.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email");
    }
    if (email === normalizeEmail(identity.email)) {
      throw new Error("You are already the owner");
    }

    const existing = await getAccessEntryByEmail(ctx, args.documentId, email);
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
      return existing._id;
    }

    return await ctx.db.insert("documentAccess", {
      documentId: args.documentId,
      email,
      role: args.role,
      invitedAt: Date.now(),
    });
  },
});

export const listByDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await getDocumentForRead(ctx, args.documentId);
    return await ctx.db
      .query("documentAccess")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .take(200);
  },
});

export const updateRole = mutation({
  args: {
    accessId: v.id("documentAccess"),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.accessId);
    if (!entry) throw new Error("Access entry not found");
    await requireOwner(ctx, entry.documentId);
    await ctx.db.patch(args.accessId, { role: args.role });
    return null;
  },
});

export const remove = mutation({
  args: { accessId: v.id("documentAccess") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.accessId);
    if (!entry) return null;
    await requireOwner(ctx, entry.documentId);
    await ctx.db.delete(args.accessId);
    return null;
  },
});

export const getForUser = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const email = normalizeEmail(identity.email);
    if (!email) return null;
    return await getAccessEntryByEmail(ctx, args.documentId, email);
  },
});
