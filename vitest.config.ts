import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests live under tests/, mirroring the source tree:
//
//   tests/unit/...         — pure functions, Node env, fastest
//     lib/errors.test.ts
//     lib/export/{common,docx,markdown}.test.ts
//     convex/helpers.test.ts          (normalizeEmail only — pure)
//     app/_components/template-preview-helpers.test.ts
//
//   tests/integration/...  — Convex handlers against in-memory DB,
//                            edge-runtime env, deterministic via convex-test
//     _utils.ts            — shared convexTest() factory + canonical identities
//     documents.test.ts
//     access.test.ts
//
// Keeping the two projects split means a failure in one surface doesn't
// hide the other and each picks the right environment (Node vs edge).

const alias = { "@": path.resolve(__dirname, ".") };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          restoreMocks: true,
          clearMocks: true,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "edge-runtime",
          include: ["tests/integration/**/*.test.ts"],
          server: { deps: { inline: ["convex-test"] } },
          restoreMocks: true,
          clearMocks: true,
        },
      },
    ],
  },
});
