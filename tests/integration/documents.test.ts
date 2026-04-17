import { describe, it, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import {
  createTestEnv,
  OWNER,
  EDITOR,
  VIEWER,
  STRANGER,
} from "./_utils";

/**
 * Integration tests for the documents module.
 *
 * Each test spins up a fresh in-memory Convex DB via `convex-test`, so
 * there is no shared state between tests and no ordering coupling.
 * Identities are injected via `.withIdentity(...)`; the handlers call
 * `ctx.auth.getUserIdentity()` as they do in production.
 */

// --- helpers ------------------------------------------------------------

async function seedOwnedDoc(t: ReturnType<typeof createTestEnv>) {
  const id = await t
    .withIdentity(OWNER)
    .mutation(api.documents.create, { title: "Owner's doc" });
  return id;
}

async function shareAs(
  t: ReturnType<typeof createTestEnv>,
  documentId: Awaited<ReturnType<typeof seedOwnedDoc>>,
  email: string,
  role: "editor" | "viewer",
) {
  await t
    .withIdentity(OWNER)
    .mutation(api.access.invite, { documentId, email, role });
}

// --- tests --------------------------------------------------------------

describe("documents.create", () => {
  it("creates a document owned by the caller", async () => {
    const t = createTestEnv();
    const id = await t
      .withIdentity(OWNER)
      .mutation(api.documents.create, { title: "Hello" });
    const doc = await t
      .withIdentity(OWNER)
      .query(api.documents.getById, { documentId: id });
    expect(doc).not.toBeNull();
    expect(doc!.doc.title).toBe("Hello");
    expect(doc!.isOwner).toBe(true);
    expect(doc!.isEditable).toBe(true);
  });

  it("defaults title to 'Untitled document' when not provided", async () => {
    const t = createTestEnv();
    const id = await t.withIdentity(OWNER).mutation(api.documents.create, {});
    const doc = await t
      .withIdentity(OWNER)
      .query(api.documents.getById, { documentId: id });
    expect(doc!.doc.title).toBe("Untitled document");
  });

  it("rejects create when unauthenticated", async () => {
    const t = createTestEnv();
    await expect(
      t.mutation(api.documents.create, { title: "X" }),
    ).rejects.toThrow(/Not authenticated/);
  });
});

describe("documents.getById — access control", () => {
  it("owner gets isEditable: true", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    const doc = await t
      .withIdentity(OWNER)
      .query(api.documents.getById, { documentId: id });
    expect(doc!.isOwner).toBe(true);
    expect(doc!.isEditable).toBe(true);
    expect(doc!.role).toBeNull();
  });

  it("invited editor gets isEditable: true, isOwner: false", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await shareAs(t, id, EDITOR.email, "editor");
    const doc = await t
      .withIdentity(EDITOR)
      .query(api.documents.getById, { documentId: id });
    expect(doc!.isOwner).toBe(false);
    expect(doc!.role).toBe("editor");
    expect(doc!.isEditable).toBe(true);
  });

  it("invited viewer gets isEditable: false", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await shareAs(t, id, VIEWER.email, "viewer");
    const doc = await t
      .withIdentity(VIEWER)
      .query(api.documents.getById, { documentId: id });
    expect(doc!.role).toBe("viewer");
    expect(doc!.isEditable).toBe(false);
  });

  it("returns null for an un-invited user (stranger)", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    const doc = await t
      .withIdentity(STRANGER)
      .query(api.documents.getById, { documentId: id });
    expect(doc).toBeNull();
  });

  it("returns null when unauthenticated (does not throw)", async () => {
    // Critical contract — queries stay subscribed during sign-out, so
    // throwing here would surface as a runtime overlay.
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    const doc = await t.query(api.documents.getById, { documentId: id });
    expect(doc).toBeNull();
  });

  it("returns null for a soft-deleted document", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await t.withIdentity(OWNER).mutation(api.documents.softDelete, {
      documentId: id,
    });
    const doc = await t
      .withIdentity(OWNER)
      .query(api.documents.getById, { documentId: id });
    expect(doc).toBeNull();
  });
});

describe("documents.updateContent — access control", () => {
  const content = JSON.stringify({ type: "doc", content: [] });

  it("owner can update content", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.documents.updateContent, { documentId: id, content });
  });

  it("invited editor can update content", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await shareAs(t, id, EDITOR.email, "editor");
    await t
      .withIdentity(EDITOR)
      .mutation(api.documents.updateContent, { documentId: id, content });
  });

  it("viewer cannot update content", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await shareAs(t, id, VIEWER.email, "viewer");
    await expect(
      t
        .withIdentity(VIEWER)
        .mutation(api.documents.updateContent, { documentId: id, content }),
    ).rejects.toThrow(/Edit access required/);
  });

  it("stranger cannot update content", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await expect(
      t
        .withIdentity(STRANGER)
        .mutation(api.documents.updateContent, { documentId: id, content }),
    ).rejects.toThrow(/Access denied/);
  });
});

describe("documents.updateTitle — access control", () => {
  it("owner can rename", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.documents.updateTitle, { documentId: id, title: "New" });
    const doc = await t
      .withIdentity(OWNER)
      .query(api.documents.getById, { documentId: id });
    expect(doc!.doc.title).toBe("New");
  });

  it("editor can rename", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await shareAs(t, id, EDITOR.email, "editor");
    await t
      .withIdentity(EDITOR)
      .mutation(api.documents.updateTitle, {
        documentId: id,
        title: "Changed",
      });
  });

  it("viewer cannot rename", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await shareAs(t, id, VIEWER.email, "viewer");
    await expect(
      t
        .withIdentity(VIEWER)
        .mutation(api.documents.updateTitle, {
          documentId: id,
          title: "X",
        }),
    ).rejects.toThrow(/Edit access required/);
  });

  it("blank title is normalized to 'Untitled document'", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.documents.updateTitle, { documentId: id, title: "   " });
    const doc = await t
      .withIdentity(OWNER)
      .query(api.documents.getById, { documentId: id });
    expect(doc!.doc.title).toBe("Untitled document");
  });
});

describe("documents.softDelete", () => {
  it("only the owner can soft-delete", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await shareAs(t, id, EDITOR.email, "editor");
    await expect(
      t.withIdentity(EDITOR).mutation(api.documents.softDelete, {
        documentId: id,
      }),
    ).rejects.toThrow(/Owner access required/);
  });

  it("after soft-delete, getById returns null for the owner too", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await t.withIdentity(OWNER).mutation(api.documents.softDelete, {
      documentId: id,
    });
    const doc = await t
      .withIdentity(OWNER)
      .query(api.documents.getById, { documentId: id });
    expect(doc).toBeNull();
  });
});

describe("documents.listByUser", () => {
  it("returns [] when unauthenticated (sign-out race safety)", async () => {
    const t = createTestEnv();
    const list = await t.query(api.documents.listByUser, {
      filterType: "anyone",
    });
    expect(list).toEqual([]);
  });

  it("'me' filter returns only docs the caller owns", async () => {
    const t = createTestEnv();
    await t.withIdentity(OWNER).mutation(api.documents.create, {
      title: "Mine A",
    });
    await t.withIdentity(OWNER).mutation(api.documents.create, {
      title: "Mine B",
    });
    // A shared-in doc must NOT appear under 'me'.
    const strangerDoc = await t
      .withIdentity(STRANGER)
      .mutation(api.documents.create, { title: "Stranger's" });
    await t
      .withIdentity(STRANGER)
      .mutation(api.access.invite, {
        documentId: strangerDoc,
        email: OWNER.email,
        role: "editor",
      });
    const list = await t
      .withIdentity(OWNER)
      .query(api.documents.listByUser, { filterType: "me" });
    expect(list.map((d) => d.title).sort()).toEqual(["Mine A", "Mine B"]);
  });

  it("'shared' filter returns only docs shared-in to the caller", async () => {
    const t = createTestEnv();
    await t.withIdentity(OWNER).mutation(api.documents.create, {
      title: "Mine",
    });
    const otherId = await t
      .withIdentity(STRANGER)
      .mutation(api.documents.create, { title: "From Stranger" });
    await t
      .withIdentity(STRANGER)
      .mutation(api.access.invite, {
        documentId: otherId,
        email: OWNER.email,
        role: "viewer",
      });
    const list = await t
      .withIdentity(OWNER)
      .query(api.documents.listByUser, { filterType: "shared" });
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("From Stranger");
  });

  it("'anyone' filter merges owned + shared (deduped)", async () => {
    const t = createTestEnv();
    await t.withIdentity(OWNER).mutation(api.documents.create, {
      title: "Mine",
    });
    const otherId = await t
      .withIdentity(STRANGER)
      .mutation(api.documents.create, { title: "From Stranger" });
    await t
      .withIdentity(STRANGER)
      .mutation(api.access.invite, {
        documentId: otherId,
        email: OWNER.email,
        role: "editor",
      });
    const list = await t
      .withIdentity(OWNER)
      .query(api.documents.listByUser, { filterType: "anyone" });
    expect(list).toHaveLength(2);
  });

  it("excludes soft-deleted documents", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await t.withIdentity(OWNER).mutation(api.documents.softDelete, {
      documentId: id,
    });
    const list = await t
      .withIdentity(OWNER)
      .query(api.documents.listByUser, { filterType: "anyone" });
    expect(list).toHaveLength(0);
  });
});

describe("documents.duplicate", () => {
  it("creates a new doc owned by the caller with '(copy)' suffix", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    const copyId = await t
      .withIdentity(OWNER)
      .mutation(api.documents.duplicate, { documentId: id });
    expect(copyId).not.toBe(id);
    const copy = await t
      .withIdentity(OWNER)
      .query(api.documents.getById, { documentId: copyId });
    expect(copy!.doc.title).toMatch(/copy/i);
    expect(copy!.isOwner).toBe(true);
  });

  it("an editor can duplicate — they become owner of the copy", async () => {
    const t = createTestEnv();
    const id = await seedOwnedDoc(t);
    await shareAs(t, id, EDITOR.email, "editor");
    const copyId = await t
      .withIdentity(EDITOR)
      .mutation(api.documents.duplicate, { documentId: id });
    const copy = await t
      .withIdentity(EDITOR)
      .query(api.documents.getById, { documentId: copyId });
    expect(copy!.isOwner).toBe(true);
  });
});

describe("documents.createFromTemplate", () => {
  it("creates a document seeded with the template's content", async () => {
    const t = createTestEnv();
    const templateId = await t.run(async (ctx) =>
      ctx.db.insert("templates", {
        name: "Blank",
        content: JSON.stringify({ type: "doc", content: [] }),
      }),
    );
    const docId = await t
      .withIdentity(OWNER)
      .mutation(api.documents.createFromTemplate, { templateId });
    const doc = await t
      .withIdentity(OWNER)
      .query(api.documents.getById, { documentId: docId });
    expect(doc!.doc.content).toBe(
      JSON.stringify({ type: "doc", content: [] }),
    );
    expect(doc!.isOwner).toBe(true);
  });

  it("throws when the template does not exist", async () => {
    const t = createTestEnv();
    // Create a template and delete it to get a valid-shape but missing id.
    const tid = await t.run(async (ctx) =>
      ctx.db.insert("templates", {
        name: "Temp",
        content: "{}",
      }),
    );
    await t.run(async (ctx) => ctx.db.delete(tid));
    await expect(
      t
        .withIdentity(OWNER)
        .mutation(api.documents.createFromTemplate, { templateId: tid }),
    ).rejects.toThrow(/not found|Template/i);
  });
});
