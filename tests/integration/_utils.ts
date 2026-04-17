/// <reference types="vite/client" />
// The triple-slash above is required so TypeScript knows about the
// Vite-provided `import.meta.glob` extension used by convex-test.
import { convexTest } from "convex-test";
import schema from "@/convex/schema";

// convex-test uses this glob to locate every Convex module (including
// the _generated folder, which it reads to find the module root). The
// glob is relative to *this* file, so it must walk up to the convex/
// directory. The recommended pattern from the convex-test docs matches
// `.ts` and `.js` via the trailing `s`. It's fine for .d.ts files to
// be included — convex-test ignores anything that doesn't export Convex
// function definitions.
const modules = import.meta.glob("../../convex/**/*.*s");

export function createTestEnv() {
  return convexTest(schema, modules);
}

// Canonical identities used across the suites. tokenIdentifier mirrors
// Clerk's real format (`<issuer>|<subject>`) just so the code under test
// operates on something that looks production-shaped, but the string
// itself is opaque — only identity-vs-identity equality matters.
export const OWNER = {
  subject: "user-owner",
  tokenIdentifier: "clerk|user-owner",
  email: "owner@example.com",
};
export const EDITOR = {
  subject: "user-editor",
  tokenIdentifier: "clerk|user-editor",
  email: "editor@example.com",
};
export const VIEWER = {
  subject: "user-viewer",
  tokenIdentifier: "clerk|user-viewer",
  email: "viewer@example.com",
};
export const STRANGER = {
  subject: "user-stranger",
  tokenIdentifier: "clerk|user-stranger",
  email: "stranger@example.com",
};
