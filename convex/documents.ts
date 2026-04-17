import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  getDocumentForRead,
  normalizeEmail,
  requireEditAccess,
  requireIdentity,
  requireOwner,
} from "./helpers";

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    templateId: v.optional(v.id("templates")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const documentId: Id<"documents"> = await ctx.db.insert("documents", {
      title: args.title ?? "Untitled document",
      ownerId: identity.tokenIdentifier,
      content: args.content,
      createdAt: now,
      updatedAt: now,
      templateId: args.templateId,
    });
    return documentId;
  },
});

export const createFromTemplate = mutation({
  args: { templateId: v.id("templates") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    const now = Date.now();
    const documentId: Id<"documents"> = await ctx.db.insert("documents", {
      title: template.name === "Blank" ? "Untitled document" : template.name,
      ownerId: identity.tokenIdentifier,
      content: template.content,
      createdAt: now,
      updatedAt: now,
      templateId: args.templateId,
    });
    return documentId;
  },
});

export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.deletedAt !== undefined) return null;

    const isOwner = doc.ownerId === identity.tokenIdentifier;
    if (isOwner) {
      return { doc, isOwner: true as const, role: null, isEditable: true };
    }

    const email = normalizeEmail(identity.email);
    if (!email) return null;
    const access = await ctx.db
      .query("documentAccess")
      .withIndex("by_documentId_and_email", (q) =>
        q.eq("documentId", args.documentId).eq("email", email),
      )
      .unique();
    if (!access) return null;
    return {
      doc,
      isOwner: false as const,
      role: access.role,
      isEditable: access.role === "editor",
    };
  },
});

export const listByUser = query({
  args: {
    filterType: v.union(
      v.literal("anyone"),
      v.literal("me"),
      v.literal("shared"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const uid = identity.tokenIdentifier;

    const owned: Doc<"documents">[] =
      args.filterType === "shared"
        ? []
        : await ctx.db
            .query("documents")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", uid))
            .take(50);

    let shared: Doc<"documents">[] = [];
    if (args.filterType !== "me") {
      const email = normalizeEmail(identity.email);
      if (email) {
        const accessRows = await ctx.db
          .query("documentAccess")
          .withIndex("by_email", (q) => q.eq("email", email))
          .take(50);
        const sharedDocs = await Promise.all(
          accessRows.map((a) => ctx.db.get(a.documentId)),
        );
        shared = sharedDocs.filter(
          (d): d is Doc<"documents"> =>
            d !== null &&
            d.deletedAt === undefined &&
            d.ownerId !== uid,
        );
      }
    }

    const byId = new Map<Id<"documents">, Doc<"documents">>();
    for (const d of owned) {
      if (d.deletedAt === undefined) byId.set(d._id, d);
    }
    for (const d of shared) byId.set(d._id, d);

    return Array.from(byId.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50);
  },
});

export const updateContent = mutation({
  args: {
    documentId: v.id("documents"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEditAccess(ctx, args.documentId);
    await ctx.db.patch(args.documentId, {
      content: args.content,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateTitle = mutation({
  args: {
    documentId: v.id("documents"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEditAccess(ctx, args.documentId);
    const trimmed = args.title.trim();
    await ctx.db.patch(args.documentId, {
      title: trimmed.length === 0 ? "Untitled document" : trimmed,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const softDelete = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.documentId);
    await ctx.db.patch(args.documentId, { deletedAt: Date.now() });
    return null;
  },
});

export const duplicate = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const { doc } = await getDocumentForRead(ctx, args.documentId);
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const newId: Id<"documents"> = await ctx.db.insert("documents", {
      title: `${doc.title} - Copy`,
      ownerId: identity.tokenIdentifier,
      content: doc.content,
      createdAt: now,
      updatedAt: now,
      templateId: doc.templateId,
    });
    return newId;
  },
});
