import { describe, it, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import {
  createTestEnv,
  OWNER,
  EDITOR,
  VIEWER,
  STRANGER,
} from "./_utils";

async function seedOwnedDoc(t: ReturnType<typeof createTestEnv>) {
  return await t
    .withIdentity(OWNER)
    .mutation(api.documents.create, { title: "Doc" });
}

describe("access.invite", () => {
  it("owner can invite by email with editor role", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: EDITOR.email,
        role: "editor",
      });
    const entries = await t
      .withIdentity(OWNER)
      .query(api.access.listByDocument, { documentId: docId });
    expect(entries).toHaveLength(1);
    expect(entries[0].email).toBe(EDITOR.email);
    expect(entries[0].role).toBe("editor");
  });

  it("normalizes the invited email (lowercase + trim)", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: "  EDITOR@Example.com  ",
        role: "editor",
      });
    const entries = await t
      .withIdentity(OWNER)
      .query(api.access.listByDocument, { documentId: docId });
    expect(entries[0].email).toBe("editor@example.com");
  });

  it("non-owner cannot invite (viewer)", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: VIEWER.email,
        role: "viewer",
      });
    await expect(
      t
        .withIdentity(VIEWER)
        .mutation(api.access.invite, {
          documentId: docId,
          email: STRANGER.email,
          role: "editor",
        }),
    ).rejects.toThrow(/Owner access required/);
  });

  it("rejects invalid email shapes", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    for (const bad of ["", "not-an-email", "foo@", "@bar.com"]) {
      await expect(
        t
          .withIdentity(OWNER)
          .mutation(api.access.invite, {
            documentId: docId,
            email: bad,
            role: "editor",
          }),
      ).rejects.toThrow(/Invalid email/);
    }
  });

  it("rejects inviting the owner themself", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await expect(
      t
        .withIdentity(OWNER)
        .mutation(api.access.invite, {
          documentId: docId,
          email: OWNER.email,
          role: "editor",
        }),
    ).rejects.toThrow(/already the owner/);
  });

  it("is idempotent — inviting the same email twice updates the role in place", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: EDITOR.email,
        role: "viewer",
      });
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: EDITOR.email,
        role: "editor",
      });
    const entries = await t
      .withIdentity(OWNER)
      .query(api.access.listByDocument, { documentId: docId });
    expect(entries).toHaveLength(1);
    expect(entries[0].role).toBe("editor");
  });
});

describe("access.listByDocument", () => {
  it("owner and shared members can list collaborators", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: EDITOR.email,
        role: "editor",
      });
    for (const identity of [OWNER, EDITOR]) {
      const entries = await t
        .withIdentity(identity)
        .query(api.access.listByDocument, { documentId: docId });
      expect(entries).toHaveLength(1);
    }
  });

  it("a stranger cannot list collaborators", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await expect(
      t
        .withIdentity(STRANGER)
        .query(api.access.listByDocument, { documentId: docId }),
    ).rejects.toThrow(/Access denied/);
  });
});

describe("access.updateRole", () => {
  it("owner can promote viewer to editor", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: VIEWER.email,
        role: "viewer",
      });
    const entries = await t
      .withIdentity(OWNER)
      .query(api.access.listByDocument, { documentId: docId });
    await t
      .withIdentity(OWNER)
      .mutation(api.access.updateRole, {
        accessId: entries[0]._id,
        role: "editor",
      });
    // Re-fetch from the viewer's side to confirm role actually changed.
    const after = await t
      .withIdentity(VIEWER)
      .query(api.documents.getById, { documentId: docId });
    expect(after!.isEditable).toBe(true);
  });

  it("non-owner cannot change a role", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: EDITOR.email,
        role: "editor",
      });
    const entries = await t
      .withIdentity(OWNER)
      .query(api.access.listByDocument, { documentId: docId });
    await expect(
      t
        .withIdentity(EDITOR)
        .mutation(api.access.updateRole, {
          accessId: entries[0]._id,
          role: "viewer",
        }),
    ).rejects.toThrow(/Owner access required/);
  });
});

describe("access.remove", () => {
  it("owner can remove a collaborator", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: EDITOR.email,
        role: "editor",
      });
    const entries = await t
      .withIdentity(OWNER)
      .query(api.access.listByDocument, { documentId: docId });
    await t
      .withIdentity(OWNER)
      .mutation(api.access.remove, { accessId: entries[0]._id });
    // Now the editor should have no access.
    const doc = await t
      .withIdentity(EDITOR)
      .query(api.documents.getById, { documentId: docId });
    expect(doc).toBeNull();
  });

  it("silently succeeds when the access entry no longer exists", async () => {
    // Defensive contract: the remove handler returns null for missing ids
    // rather than throwing, so double-click / race-condition removal from
    // the share dialog is a no-op, not an error toast.
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: EDITOR.email,
        role: "editor",
      });
    const entries = await t
      .withIdentity(OWNER)
      .query(api.access.listByDocument, { documentId: docId });
    const accessId = entries[0]._id;
    await t
      .withIdentity(OWNER)
      .mutation(api.access.remove, { accessId });
    // Second remove — entry gone — must not throw.
    await t
      .withIdentity(OWNER)
      .mutation(api.access.remove, { accessId });
  });
});

describe("access.getForUser", () => {
  it("returns the invitee's access entry", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    await t
      .withIdentity(OWNER)
      .mutation(api.access.invite, {
        documentId: docId,
        email: VIEWER.email,
        role: "viewer",
      });
    const entry = await t
      .withIdentity(VIEWER)
      .query(api.access.getForUser, { documentId: docId });
    expect(entry).not.toBeNull();
    expect(entry!.role).toBe("viewer");
  });

  it("returns null for a user with no access", async () => {
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    const entry = await t
      .withIdentity(STRANGER)
      .query(api.access.getForUser, { documentId: docId });
    expect(entry).toBeNull();
  });

  it("returns null when unauthenticated (does not throw)", async () => {
    // Mirrors listByUser's sign-out-safety contract.
    const t = createTestEnv();
    const docId = await seedOwnedDoc(t);
    const entry = await t.query(api.access.getForUser, { documentId: docId });
    expect(entry).toBeNull();
  });
});
