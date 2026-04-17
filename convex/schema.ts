import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    ownerId: v.string(),
    content: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    templateId: v.optional(v.id("templates")),
    deletedAt: v.optional(v.number()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_updatedAt", ["updatedAt"]),

  documentAccess: defineTable({
    documentId: v.id("documents"),
    email: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    invitedAt: v.number(),
  })
    .index("by_documentId", ["documentId"])
    .index("by_email", ["email"])
    .index("by_documentId_and_email", ["documentId", "email"]),

  templates: defineTable({
    name: v.string(),
    content: v.string(),
    thumbnailUrl: v.optional(v.string()),
  }),
});
