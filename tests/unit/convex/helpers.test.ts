import { describe, it, expect } from "vitest";
import { normalizeEmail } from "@/convex/helpers";

// normalizeEmail is the lookup key for every non-owner access check in the
// app. Its contract is narrow on purpose: trim, lowercase, and reject
// blank strings (returning `null`). It does NOT validate the shape of an
// email — that check lives in `access.invite`, where a stricter regex is
// applied before persistence. These tests pin the stated contract so
// future "make it smarter" changes surface as failures.
describe("normalizeEmail", () => {
  it("lowercases and trims a well-formed email", () => {
    expect(normalizeEmail("  Alice@Example.COM  ")).toBe("alice@example.com");
  });

  it("returns null for undefined (Clerk JWT without email claim)", () => {
    expect(normalizeEmail(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(normalizeEmail("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail("\t\n")).toBeNull();
  });

  it("is idempotent — normalizing twice yields the same result", () => {
    const once = normalizeEmail("  BOB@Foo.Co  ");
    const twice = normalizeEmail(once ?? undefined);
    expect(twice).toBe(once);
  });

  it("does not reject malformed-but-non-empty strings (validation is not its job)", () => {
    // Contract is explicit: this helper normalizes, it doesn't validate.
    expect(normalizeEmail("not-an-email")).toBe("not-an-email");
    expect(normalizeEmail("  @@  ")).toBe("@@");
  });
});
