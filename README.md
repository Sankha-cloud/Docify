# DocFlow

A real-time collaborative rich-text editor — a mini Google Docs clone built with Next.js 16, Convex, Liveblocks, and Tiptap.

---

## Features

- **Real-time collaboration** — multiplayer editing with Yjs CRDT via Liveblocks; presence cursors with user name labels and an avatar stack
- **Rich-text editing** — Tiptap v3 with bold/italic/underline/strikethrough, headings, lists, blockquotes, code blocks, tables, images, links, text alignment, highlights, and font sizing
- **Google-Docs-style page layout** — A4 pages (794 × 1123 px), 1-inch margins, simulated page breaks with thin dividers, a floating `Page X of Y` indicator, and a soft shadow that makes each page visibly float on the desktop
- **Dark / light / system theme** — `next-themes` driven toggle; document pages keep a fixed light palette (scoped via CSS custom property overrides) so content and exports stay readable and consistent across modes
- **Auto-save** — 500 ms debounced persistence to Convex with a `Saving… / Saved ✓` badge, with save-failure toasts surfacing the real server error
- **Document sharing** — invite by email, per-user Editor / Viewer roles, copy link, and full access enforcement at three layers (Convex query, editor UI, Liveblocks auth)
- **Export** — PDF (via `html2canvas-pro`, which natively parses modern `oklch`/`lab`/`color()` CSS functions), DOCX with full image/table/nested-list/hardBreak fidelity, Markdown, and plain text — all client-side, lazy-loaded on use
- **Rich template gallery** — each template card renders a miniature preview of its actual content instead of a generic icon
- **Home dashboard** — recent-documents list with ownership filter, client-side search, rename, duplicate, and soft-delete
- **Auth** — Clerk sign-in / sign-up with email + Google OAuth; protected routes via middleware with auto-redirect on sign-out

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, React Compiler, Turbopack) |
| UI | React 19.2, Tailwind v4, shadcn/ui (base-nova style over `@base-ui/react`), `next-themes` for dark mode |
| Editor | Tiptap v3 + `@liveblocks/react-tiptap` (wired via the global `LiveblocksProvider`) |
| Backend | Convex (reactive DB + functions) |
| Real-time | Liveblocks + Yjs |
| Auth | Clerk (v7) with `clerkMiddleware` route protection |
| Export | jsPDF + `html2canvas-pro`, `docx` |

See [`prd.md`](./prd.md) for full architecture notes.

---

## Prerequisites

- Node.js 20+
- A Clerk account — https://dashboard.clerk.com
- A Convex account — https://dashboard.convex.dev
- A Liveblocks account — https://liveblocks.io/dashboard

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Convex
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud

# Liveblocks
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_...
LIVEBLOCKS_SECRET_KEY=sk_...
```

### 3. Start Convex

```bash
npx convex dev
```

This links the local project to your Convex deployment and writes `NEXT_PUBLIC_CONVEX_URL` for you. Leave it running — it watches `convex/` and hot-pushes schema and function changes.

### 4. Seed templates (one-time)

In the Convex dashboard → Functions → run `templates:seed` once. This inserts the four default document templates shown on the home screen.

### 5. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000. You'll be redirected to `/sign-in`.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server (Turbopack, on by default in v16) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npx convex dev` | Watch & push Convex schema / functions to your dev deployment |
| `npx convex deploy` | Push to the production Convex deployment |

---

## Project Structure

```
app/
  (auth)/                       # /sign-in and /sign-up catch-all routes
  _components/                  # home-screen components + shared dialogs
    navbar.tsx                  # top bar with search + theme toggle + user button
    template-gallery.tsx        # cards with real per-template content previews
    document-list.tsx           # recent-documents table (auth-gated query)
    share-dialog.tsx, rename-dialog.tsx, document-menu.tsx, home-content.tsx
  _lib/liveblocks.ts            # global type augmentation for Liveblocks v3 hooks
  api/liveblocks-auth/          # Liveblocks auth endpoint (re-checks Convex access)
  documents/[documentId]/
    _components/
      editor-shell.tsx          # access gate (silently redirects on trash/unshare)
      editor-ui.tsx             # header, menu bar, toolbar, Tiptap mount, reactive editable
      editor-styles.css         # A4 page + light-palette scope + dark-mode shadow
      menu-bar.tsx              # File / Edit / Insert / Format dropdowns
      toolbar.tsx               # formatting toolbar + zoom
      link-popover.tsx          # Google-Docs-style link editor (shared)
      page-indicator.tsx        # "Page X of Y" floating pill
      document-title.tsx, avatar-stack.tsx, desktop-warning.tsx, room.tsx, save-status.tsx
    page.tsx
  page.tsx                      # home dashboard (server auth gate)
  providers.tsx                 # ClerkProvider (+ afterSignOutUrl) + Convex + ThemeProvider
  layout.tsx                    # suppressHydrationWarning for next-themes
components/
  ui/                           # shadcn base-nova primitives
  theme-provider.tsx            # next-themes wrapper
  mode-toggle.tsx               # Sun/Moon dropdown (Light / Dark / System)
convex/
  schema.ts                     # documents, documentAccess, templates
  documents.ts, access.ts, templates.ts, helpers.ts  # queries + mutations
lib/
  export/                       # per-format exporters (common, text, markdown, pdf, docx, types, index)
  errors.ts                     # shared getErrorMessage helper
  image-upload.ts               # shared pickAndInsertImage (menu-bar + toolbar)
  utils.ts                      # cn()
proxy.ts                        # Next.js 16 middleware — clerkMiddleware + auth.protect() gating
```

---

## Access Control

Three independent checks enforce permissions — never rely on just one:

1. **Convex query** (`documents.getById`) verifies caller is owner or has an `documentAccess` entry before returning data.
2. **Editor page** sets `isEditable` from that result; viewers get `editable={false}` and the toolbar is hidden.
3. **Liveblocks auth endpoint** re-checks Convex access before issuing a token and scopes it (`FULL_ACCESS` for owner/editor, `READ_ACCESS` for viewer).

Details in [`prd.md` §6](./prd.md).

---

## Deployment

1. Push this repo to GitHub.
2. Import into Vercel — framework preset auto-detects Next.js 16.
3. Add all environment variables from `.env.local` to the Vercel project.
4. In a terminal: `npx convex deploy` to push the prod Convex deployment. Copy the production `NEXT_PUBLIC_CONVEX_URL` into Vercel.
5. Deploy. Verify the full end-to-end flow on the prod URL.

---

## Next.js 16 Notes

This project targets Next.js 16.2 — a few things differ from v15 tutorials:

- Route protection lives in `proxy.ts`, not `middleware.ts`; the exported function is named `proxy`.
- Turbopack is on by default for both `dev` and `build` — do not add `--turbopack` flags.
- Caching is fully opt-in. Use `'use cache'` only where wanted (e.g. `templates.list`).
- `experimental.ppr` has been removed.
- React Compiler is stable and enabled via `reactCompiler: true` in `next.config.ts`.

---

## License

Private project — not open source.
