# DocFlow — Product Requirements Document
**Version:** 2.3 (polish pass)
**Author:** Sankha
**Date:** April 14, 2026 · last update 2026-04-17
**Status:** 🟢 Core v1 implemented + UX polish pass complete — pending production deploy

> **How to use this PRD:**
> Feed each Phase section to Cursor/Claude Code one at a time.
> Each phase describes WHAT to build and WHY — not HOW.
> The AI figures out the how. You verify the checkpoint before moving on.

---

## Implementation Status (2026-04-17)

Legend: ✅ done · 🟡 partial / deviated · ⏸️ deferred to v1.1 · ❌ not applicable

### Phases
| # | Phase | Status | Notes |
|---|---|---|---|
| 1 | Project Scaffolding | ✅ | Tiptap v3, React Compiler + `cacheComponents` enabled, `proxy.ts` confirmed correct. |
| 2 | Convex schema + all functions | ✅ | `documents`, `documentAccess`, `templates` tables + 12 queries/mutations. Access keyed by `email` (see 4.1). |
| 3 | Auth pages | ✅ | `/sign-in`, `/sign-up` catch-all routes wrapped in Suspense for `cacheComponents`. |
| 4 | Home Screen | ✅ | Navbar + template gallery + document list with filter/search/three-dot menu + rename + empty state. |
| 5 | Document Editor (single-user) | ✅ | Auto-save 500 ms, title sync to tab, File/Edit/Insert/Format menus, full toolbar, font-size via TextStyleKit `setFontSize`. Google-Docs-style A4 page layout + page indicator (see polish pass below). |
| 6 | Export (PDF, DOCX, MD, TXT) | ✅ | PDF via html2canvas+jsPDF with oklch/lab colour-function shim (see polish pass); DOCX via docx.js walker; MD via custom Tiptap→Markdown serializer; TXT via `editor.getText()`. |
| 7 | Real-Time Collaboration | ✅ | `/api/liveblocks-auth` verifies Convex access per request; `useLiveblocksExtension` drives Yjs + cursors; `AvatarStack` via `useOthers()`. Google-Docs-style thin caret + floating name label (see polish pass). |
| 8 | Sharing & Access Enforcement | ✅ | Share dialog (invite/role/remove/copy-link). Three-layer enforcement: `documents.getById` → editor `isEditable` → Liveblocks auth token scope (`FULL_ACCESS` vs `READ_ACCESS`). |
| 9 | Polish | 🟡 | Skeletons, error boundary, toasts, responsive warning banner done. UX polish pass complete. Vercel production deploy + `npx convex deploy` not done yet. |

### Polish Pass (2026-04-17)

Completed in a single session against the live app:

- **Google-Docs-style page layout** — the ProseMirror root is styled as a single A4 page (794 × 1123 px at 96 dpi) with 1-inch margins on a light blue-gray desktop (`bg-[#eef1f5]`). Simulated page breaks are painted via a 1133-px-cycle `repeating-linear-gradient` (1123 px white page → 1 px divider → 8 px gap → 1 px divider). No per-page DOM nodes (deferred to v1.1).
- **Floating page indicator** — `page-indicator.tsx` shows `Page X of Y` in a fixed pill, bottom-right. Listens to the `[data-tiptap-root]` scroller (auto-falls-back to `window`) and uses `getBoundingClientRect()` + a `ResizeObserver` on `.ProseMirror` so it works regardless of which element actually scrolls.
- **Layout: `<main>` as scroll container** — `EditorUI` return is now wrapped in `<div className="flex h-screen flex-col">`. Previously `body` was `min-h-full`, which let the document grow past the viewport and made the window scroll — so the `data-tiptap-root` scroll listener never fired.
- **`DropdownMenuItem` `onSelect` adapter** — Base UI's `Menu.Item` doesn't support `onSelect` (that's Radix-only). Adapter in `components/ui/dropdown-menu.tsx` forwards `onSelect` to `onClick` so the whole codebase keeps the Radix-style API.
- **Edit menu** — Cut / Copy are now disabled when the selection is empty (tracked via `useEditorState`). Paste uses `navigator.clipboard.readText()` with a toast fallback (the direct `document.execCommand("paste")` is blocked in modern browsers).
- **Google-Docs-style link popover** — new `link-popover.tsx` with display-text + URL inputs, existing-URL preview with Remove, and an Apply button. Reused by both the toolbar link button and the Insert → Link menu item; the menu item version renders a hidden `sr-only` anchor and is driven programmatically. Link application uses `setTextSelection(sel).insertContent({…marks:[{type:"link"}]})` — the naïve `deleteRange + insertContentAt` threw ProseMirror's `TransformError: Inserted content deeper than insertion position` when the deletion landed on a block boundary.
- **PDF export — `oklch` / `lab` colour-function shim** — html2canvas can't parse modern CSS colour functions, which Tailwind v4's theme variables (and Liveblocks' selection CSS) use heavily. `lib/export.ts` now: (1) walks every `cssRule.cssText` to collect every unique `oklch|oklab|lab|lch(...)` string, (2) resolves each to `rgb()` via a hidden probe element + `getComputedStyle`, (3) in html2canvas's `onclone`, replaces those literal strings inside every `<style>` element. Earlier attempt only patched `--` custom properties and missed direct-value usage.
- **Liveblocks cursor styling** — imported `@liveblocks/react-tiptap/styles.css` (previously missing; the default look was a solid blue selection block). Added Google-Docs-style caret + floating name label with a fade-out animation and a 0.35-opacity selection override in `editor-styles.css`.

### Deviations from the original spec
- **Tiptap v3**, not v2 (current stable release; adapter APIs differ slightly — StarterKit now includes `Link` + `Underline`, history renamed to `undoRedo`, `FontSize` lives in `@tiptap/extension-text-style`).
- **`@tiptap/extension-collaboration-cursor` was dropped.** Liveblocks' `@liveblocks/react-tiptap` extension handles cursors/presence labels itself; pulling in the separate cursor extension caused a v2/v3 peer conflict during install.
- **Markdown export** uses a hand-rolled Tiptap JSON → Markdown walker in `lib/export.ts`. The `@tiptap/extension-markdown` package referenced in Phase 1 does not exist in v3.
- **Liveblocks auth** moved to `convex/react-clerk` + `ConvexHttpClient` at the edge — see `app/api/liveblocks-auth/route.ts`.
- **`cacheComponents: true` + React Compiler** enabled in `next.config.ts`. Pages that use `auth()` are wrapped in `<Suspense>` to satisfy the Cache Components constraint that runtime data must live under a Suspense boundary.
- **UI primitives are Base UI (`@base-ui/react`), not Radix** — shadcn "base-nova" style. This means `Menu.Item` uses `onClick` rather than `onSelect`; the adapter in `components/ui/dropdown-menu.tsx` preserves the Radix-style call-site API.

### Deferred to v1.1 (tracked, not blocking)
- ⏸️ **True pagination** — current A4 layout is visual-only via a repeating gradient; a real paginated editor (separate page DOM nodes with individual shadows, per-page headers/footers, page-break-controlled content flow) is a v1.1 item.
- ⏸️ **Find & Replace** floating panel (Section 8.4). Browser `Ctrl+F` still works.
- ⏸️ **Email delivery** on invite (Section 10 already lists this as a Non-Goal; called out for clarity).
- ⏸️ **Production deploy** to Vercel + `npx convex deploy` (Phase 9, last two bullets).
- ⏸️ **Yjs "already imported" console warning** in dev — cosmetic, tracked at https://github.com/yjs/yjs/issues/438; does not affect behavior.
- ⏸️ **Comments, version history, folders, offline mode, chart insertion** — all per Section 10.

---

## Table of Contents

1. Product Overview
2. Tech Stack Decisions & Rationale
3. API Keys & Environment Variables
4. Data Architecture
5. System Data Flow
6. Access Control Logic
7. Real-Time Collaboration Architecture
8. Feature Behavioral Specs
9. Build Phases (Cursor Prompting Plan)
10. Non-Goals (v1)

---

## 1. Product Overview

**DocFlow** is a mini Google Docs clone. The product has two surfaces:

**Surface 1 — Home Screen**
A dashboard where authenticated users see their recent documents, filter them by ownership, search by title, and create new documents from templates.

**Surface 2 — Document Editor**
A full-page rich text editor where users write content. The editor has a menu bar (File/Edit/Insert/Format), a formatting toolbar, an inline-editable document title, and a share button. Multiple users can be in the same document simultaneously — they see each other's cursors and edits in real time.

---

## 2. Tech Stack Decisions & Rationale

| Technology | Role | Why |
|---|---|---|
| Next.js 16.2 (App Router) | Frontend + API routes | SSR, file-based routing, API routes for Liveblocks auth. Turbopack stable by default — 2–5x faster builds, ~400% faster dev server startup |
| TypeScript | Language | Type safety across frontend + Convex schema |
| Clerk | Authentication | Handles sign up/in, gives us userId, user profile, avatar |
| Convex | Database | Reactive queries — UI auto-updates when DB changes. No polling. |
| Liveblocks | Real-time collab layer | CRDT-based conflict-free text sync + presence (cursors, avatars) |
| Tiptap v3 | Rich text editor | Extensible, open-source, has official Liveblocks + Yjs extensions. (Originally specced as v2; v3 is the current stable and is what ships.) |
| Yjs | CRDT engine (under Liveblocks) | The actual algorithm that merges simultaneous edits without conflicts |
| shadcn/ui + Tailwind | UI | Consistent, accessible components |
| jsPDF + html2canvas | PDF export | Render the editor HTML to a canvas then to PDF, client-side |
| docx.js | DOCX export | Build a Word-compatible XML file from Tiptap's JSON, client-side |
| React Compiler (stable) | Performance | Auto-memoizes components in Next.js 16 — reduces unnecessary re-renders with zero manual code |

### Next.js 16 — Key Breaking Changes vs v15

These are things Cursor must know upfront to avoid writing outdated patterns:

| Change | Next.js 15 (old) | Next.js 16 (new) |
|---|---|---|
| Route protection file | `middleware.ts` | `proxy.ts` (middleware.ts is deprecated) |
| Exported function name | `export default function middleware` | `export default function proxy` |
| Turbopack | Opt-in via `--turbopack` flag | Stable and on by default for `next dev` and `next build` |
| Caching | Partially automatic | Fully opt-in — all dynamic code runs at request time by default. Use `'use cache'` directive explicitly |
| PPR config | `experimental.ppr: true` | Removed — replaced by Cache Components (`'use cache'`) |
| React version | React 19 | React 19.2 (View Transitions, useEffectEvent, Activity component) |
| React Compiler | Experimental | Stable — enable via `reactCompiler: true` in next.config.ts |

---

## 3. API Keys & Environment Variables

Create `.env.local` in project root. You need exactly **6 keys** from 3 services.
Add all 6 to Vercel Environment Variables before deploying.

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY        → from Clerk dashboard → API Keys
CLERK_SECRET_KEY                         → from Clerk dashboard → API Keys
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

NEXT_PUBLIC_CONVEX_URL                   → from Convex dashboard → Settings → Deployment URL

NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY        → from Liveblocks dashboard → API Keys
LIVEBLOCKS_SECRET_KEY                    → from Liveblocks dashboard → API Keys
```

### Where to get each:

**Clerk** → https://dashboard.clerk.com
- Create Application → choose Email + Google OAuth
- Left sidebar → API Keys → copy Publishable Key + Secret Key

**Convex** → https://dashboard.convex.dev
- New Project → name it "docflow"
- Run `npx convex dev` in terminal (auto-links and gives you the URL)

**Liveblocks** → https://liveblocks.io/dashboard
- Create Project → API Keys tab → copy Public key + Secret key

> Never commit `.env.local` to Git. It is already in `.gitignore` by default in Next.js.

---

## 4. Data Architecture

### 4.1 Convex Tables

DocFlow has 3 database tables in Convex.

---

#### Table 1: `documents`

**Purpose:** Stores every document created by any user.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `title` | string | Document name. Defaults to "Untitled document" |
| `ownerId` | string | Clerk `userId` of the person who created it |
| `content` | string (optional) | Tiptap editor state as a JSON string |
| `createdAt` | number | Unix timestamp when the document was first created |
| `updatedAt` | number | Unix timestamp, updated every time content or title changes |
| `templateId` | string (optional) | ID of the template it was created from, if any |

**Indexes needed:**
- Index on `ownerId` → to efficiently fetch all docs owned by a user
- Index on `updatedAt` → to sort recent documents

**Key behavioral rules:**
- `ownerId` is set once at creation and never changes
- `content` stores Tiptap's JSON format (not HTML, not plain text) as a stringified JSON
- When a document is "deleted" by the user, it is NOT removed from the table — a `deletedAt` timestamp field is added (soft delete). Queries always filter out documents where `deletedAt` exists.
- `updatedAt` is updated by both title changes AND content changes

---

#### Table 2: `documentAccess`

**Purpose:** Stores who has been given access to a document that they don't own. This is the sharing table.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `documentId` | document ID reference | Which document this access entry is for |
| `userId` | string | Clerk `userId` of the person being given access |
| `email` | string | Email of the invited person (used for display in share dialog) |
| `role` | "editor" OR "viewer" | What level of access they have |
| `invitedAt` | number | Unix timestamp of when they were invited |

**Indexes needed:**
- Index on `documentId` → to list all collaborators for a given document
- Index on `userId` → to list all documents shared with a given user

**Key behavioral rules:**
- A document owner NEVER has an entry in this table for their own document. Ownership is tracked via `documents.ownerId`
- One user can only have one access entry per document. If you invite someone and then change their role, you UPDATE the existing entry, not create a new one
- When access is removed, the entry is fully deleted (hard delete)

---

#### Table 3: `templates`

**Purpose:** Stores the 4 built-in document templates shown on the home screen.

**Fields:**

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name: "Blank Document", "Project Proposal", etc. |
| `content` | string | Pre-written Tiptap JSON content for this template |
| `thumbnailUrl` | string (optional) | URL of the preview image shown on the template card |

**Key behavioral rules:**
- This table is seeded once during project setup and never modified by users
- All users see the same templates — no per-user customization in v1
- "Blank Document" template has empty content (empty Tiptap JSON)
- **Next.js 16 caching note:** The `templates.list` Convex query result on the home screen is a good candidate for the `'use cache'` directive since templates never change. This makes the home screen load faster for all users.

---

### 4.2 Convex Query & Mutation Map

Here is every database operation the app needs. This is what you ask Cursor to implement in Phase 2.

**Documents:**
- `documents.create` (mutation) — creates a new document row, sets ownerId to current userId
- `documents.getById` (query) — fetches one document by ID; must verify caller is owner or has access entry
- `documents.listByUser` (query) — returns documents for current user, accepts a `filter` param: "me" (only owned), "shared" (only from documentAccess table), "anyone" (both)
- `documents.updateContent` (mutation) — updates the `content` field + `updatedAt`
- `documents.updateTitle` (mutation) — updates the `title` field + `updatedAt`
- `documents.softDelete` (mutation) — sets `deletedAt` to current timestamp

**Access:**
- `access.invite` (mutation) — creates a documentAccess entry
- `access.listByDocument` (query) — returns all collaborators for a document (used in share dialog)
- `access.updateRole` (mutation) — changes the `role` field on an existing entry
- `access.remove` (mutation) — deletes a documentAccess entry
- `access.getForUser` (query) — returns a single access entry for (documentId + userId); used for access gating

**Templates:**
- `templates.list` (query) — returns all templates (no auth required)
- `templates.seed` (mutation) — inserts the 4 default templates; called once manually

---

## 5. System Data Flow

### 5.1 User Opens the App for the First Time

```
Browser hits /
      ↓
proxy.ts runs — checks Clerk session (Next.js 16: proxy.ts replaces middleware.ts)
      ↓
No session → redirect to /sign-in
      ↓
User completes Clerk sign up (email or Google)
      ↓
Clerk creates a userId and stores user profile
      ↓
Clerk redirects to / (NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL)
      ↓
Home screen loads — Convex queries fire with userId
      ↓
documents.listByUser returns empty list (new user)
      ↓
User sees: templates row + "No documents yet" empty state
```

---

### 5.2 User Creates a Document from a Template

```
User clicks a template card on home screen
      ↓
Frontend calls documents.create mutation
  with: { ownerId: currentUserId, templateId: template._id, content: template.content, title: template.name }
      ↓
Convex creates the document row, returns the new document ID
      ↓
Frontend immediately navigates to /documents/[newDocumentId]
      ↓
Editor page loads — calls documents.getById with that ID
      ↓
Tiptap initializes with the content from the template
      ↓
User starts editing
```

---

### 5.3 User Edits a Document (Auto-Save Flow)

```
User types in the editor
      ↓
Tiptap fires onUpdate event with new editor state (JSON)
      ↓
A debounce timer starts (500ms)
      ↓
If user keeps typing — timer resets
      ↓
When user pauses for 500ms — timer fires
      ↓
Frontend calls documents.updateContent mutation with new JSON string
      ↓
Convex updates content + updatedAt
      ↓
UI shows "Saving..." → "Saved ✓"
```

> NOTE: In Phase 7 (real-time collab), Liveblocks takes over the live sync between users.
> Convex still handles persistence — Liveblocks periodically pushes the final state to Convex for storage.

---

### 5.4 User Shares a Document

```
User clicks Share button in editor
      ↓
Share dialog opens — shows current collaborators (from access.listByDocument)
      ↓
User types an email address, selects "Editor" or "Viewer", clicks Share
      ↓
Frontend checks: does a documentAccess entry already exist for this email?
  YES → call access.updateRole to change the role
  NO  → call access.invite to create a new entry
      ↓
Dialog list updates reactively (Convex query re-fires)
      ↓
The invited user — next time they log in with that email — 
will see this document under "Shared with me" filter on home screen
```

---

### 5.5 Invited User Opens a Shared Document

```
Invited user logs in with their Clerk account
      ↓
Home screen: documents.listByUser with filter "anyone"
→ includes documents where their userId appears in documentAccess table
      ↓
They click the shared document → /documents/[documentId]
      ↓
Editor page calls access.getForUser with (documentId, userId)
      ↓
Role = "editor" → Tiptap is editable, full toolbar shown
Role = "viewer" → Tiptap editable=false, toolbar hidden, read-only banner shown
No entry found AND not owner → redirect to / with toast "You don't have access"
```

---

### 5.6 Real-Time Collaboration Flow (Two Users Same Document)

```
User A opens /documents/[docId]
      ↓
Editor page calls /api/liveblocks-auth endpoint
  → Liveblocks SDK sends room ID: "document-[docId]"
  → Endpoint verifies user is owner or has access entry in Convex
  → Returns signed Liveblocks token with user identity (name, color, avatar)
      ↓
User A joins Liveblocks room "document-[docId]"
      ↓
User B opens the same URL — same auth flow → joins same room
      ↓
Both users are now in the same Yjs "shared document"
      ↓
User A types "Hello"
  → Yjs CRDT records this as an operation
  → Liveblocks broadcasts the operation to all room members
  → User B's Tiptap receives the operation and applies it instantly
  → User B sees "Hello" appear in real time
      ↓
User A sees User B's cursor position in their editor
  → Cursor is labeled with User B's first name
  → Cursor color is unique per user (assigned from a preset color palette)
      ↓
Both users see each other's avatars in the top-right avatar stack
```

---

### 5.7 Document Export Flow

```
User clicks File → Download → [format]
      ↓
For PDF:
  Take the editor's DOM element (the white page div)
  → html2canvas renders it to an image
  → jsPDF wraps the image in a PDF file
  → Browser downloads [documentTitle].pdf

For DOCX:
  Take Tiptap's JSON output (editor.getJSON())
  → Walk the JSON tree (nodes: paragraph, heading, bold, italic, etc.)
  → Map each node type to the equivalent docx.js object
  → docx.js generates a valid Word XML binary
  → Browser downloads [documentTitle].docx

For Markdown:
  Tiptap's markdown extension converts JSON → Markdown string
  → Create a Blob with that string
  → Browser downloads [documentTitle].md

For Plain Text:
  editor.getText() returns raw text with no formatting
  → Create a Blob with that string
  → Browser downloads [documentTitle].txt
```

---

## 6. Access Control Logic

This is the single most important logic to get right. Every protected action must check this.

### The Two Sources of Access

A user has access to a document if EITHER of the following is true:
1. `document.ownerId === currentUserId` → they are the owner (full access always)
2. A `documentAccess` entry exists where `documentId` matches AND `userId === currentUserId` → they were invited

### Access Levels Matrix

| Action | Owner | Editor (invited) | Viewer (invited) | No Access |
|---|---|---|---|---|
| Read document content | ✅ | ✅ | ✅ | ❌ → redirect home |
| Type / edit content | ✅ | ✅ | ❌ | ❌ |
| Change document title | ✅ | ✅ | ❌ | ❌ |
| Use toolbar / menu bar | ✅ | ✅ | ❌ (hidden) | ❌ |
| Open share dialog | ✅ | ❌ | ❌ | ❌ |
| Add / remove collaborators | ✅ | ❌ | ❌ | ❌ |
| Move to trash | ✅ | ❌ | ❌ | ❌ |
| Make a copy | ✅ | ✅ | ✅ | ❌ |
| Export / download | ✅ | ✅ | ✅ | ❌ |
| Join Liveblocks room | ✅ | ✅ | ✅ (read presence only) | ❌ → 403 |

### Where to Enforce Access

Access must be checked in TWO places — not just one:

**1. In the Convex query `documents.getById`**
Before returning any document data, the query must verify the caller is the owner or has an access entry. If neither, return null or throw an error. This protects the data layer.

**2. In the page component `/documents/[documentId]`**
On page load, check access and set an `isEditable` boolean. Pass this to the editor component. This protects the UI layer.

**3. In the Liveblocks auth endpoint `/api/liveblocks-auth`**
Before issuing a Liveblocks token, re-check Convex access. This protects the real-time layer.

> All 3 checks must exist independently. Never rely on just one.

---

## 7. Real-Time Collaboration Architecture

### The Three Layers

Understanding which layer does what prevents confusion during implementation:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: CONVEX (Persistent Storage)                       │
│  • Stores final document state (content JSON)               │
│  • Stores who has access (documentAccess table)             │
│  • Source of truth for document list, titles, metadata      │
│  • Does NOT handle character-by-character sync              │
└─────────────────────────────────────────────────────────────┘
        ↑ periodic persistence sync (every few seconds)
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: LIVEBLOCKS + YJS (Real-Time Sync)                 │
│  • Handles every keystroke sync between all users in room   │
│  • Uses Yjs CRDT to merge concurrent edits without conflict │
│  • Tracks presence: who is online, where their cursor is    │
│  • Lives in memory — not a database                         │
│  • When all users leave a room, room state is persisted     │
└─────────────────────────────────────────────────────────────┘
        ↑ editor state
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: TIPTAP (Editor UI)                                │
│  • Renders the text, handles formatting commands            │
│  • Tiptap's Collaboration extension connects it to Yjs      │
│  • CollaborationCursor extension renders other users' cursors│
│  • User just types — Tiptap + Yjs handle the rest           │
└─────────────────────────────────────────────────────────────┘
```

### Liveblocks Room Naming

Every document maps to exactly one Liveblocks room.
Room ID format: `document-{convexDocumentId}`

Example: document with Convex ID `jx7abc123` → room ID `document-jx7abc123`

This naming is used in the Liveblocks auth endpoint to extract the document ID and validate access.

### User Identity in Liveblocks

When the Liveblocks auth endpoint creates a session, it attaches user metadata:
- `name` → user's first name from Clerk
- `avatar` → user's profile image URL from Clerk
- `color` → a color string picked from a fixed palette based on the userId (so the same user always gets the same color)

This metadata is what other users see when viewing cursors and the avatar stack.

### Presence vs. Persistence

- **Presence** = who is currently in the room, where their cursor is → managed entirely by Liveblocks, never stored in Convex
- **Persistence** = the actual document content → stored in Convex, loaded when the editor first opens

On first load: Tiptap loads content from Convex (cold start).
While editing: Liveblocks Yjs takes over and syncs changes between users.
On save: The Yjs document state is periodically written back to Convex as a JSON string.

---

## 8. Feature Behavioral Specs

### 8.1 Home Screen

**Template Gallery:**
- Always shows exactly 4 templates in a horizontal row: Blank Document, Project Proposal, Meeting Notes, Resume/CV
- Clicking a template card triggers document creation and immediate navigation — no confirmation dialog
- The new document's title defaults to the template name (e.g., "Meeting Notes")

**Recent Documents List:**
- Default filter on page load: "Owned by anyone" (shows owned + shared)
- Filter options: "Owned by anyone", "Owned by me", "Shared with me"
- Sorted by `updatedAt` descending — most recently touched first
- Search input filters the already-fetched list by title (client-side filtering, no new DB call)
- Each document card three-dot menu must have: Rename, Share, Move to Trash, Download
- "Rename" in the menu opens an inline rename dialog (not a full page)
- "Move to Trash" soft-deletes and removes the card from the list instantly (optimistic update)

**Navbar:**
- Search does not trigger a new Convex query — it filters the already-loaded list
- The user avatar in the top right comes directly from Clerk's `<UserButton>` component

---

### 8.2 Document Title

- Displayed above the menu bar, inline, like Google Docs
- Clicking the title turns it into a text input
- Pressing Enter or clicking away (blur) saves the new title to Convex
- If the user clears the title entirely and blurs, it reverts to "Untitled document"
- The browser tab title (`document.title`) always stays in sync with the document title

---

### 8.3 File Menu Behaviors

- **New:** Creates a blank document in Convex, opens it in a new browser tab (not current tab)
- **Make a copy:** Duplicates the current document's title (appended with "- Copy") and content into a new document row, opens it in a new tab
- **Share:** Opens the share dialog modal
- **Download → PDF/DOCX/MD/TXT:** Triggers the corresponding export function, see Section 5.7
- **Rename:** Opens a small modal with a text input pre-filled with the current title
- **Move to Trash:** Calls `documents.softDelete`, shows a toast "Moved to trash", navigates back to home screen
- **Print:** Calls `window.print()` — browser handles the rest

---

### 8.4 Edit Menu Behaviors

All edit actions call the corresponding Tiptap command:
- Undo / Redo: Tiptap's built-in undo/redo history
- Cut / Copy / Paste: Delegated to the browser's native clipboard API
- Paste without formatting: Tiptap's `insertContentAt` with plain text only
- Select all: Selects all content in the editor
- Delete: Deletes the current selection
- Find and replace: Opens a floating panel (not a modal) at the top of the editor area

---

### 8.5 Insert Menu Behaviors

- **Image:** Opens a native file picker. Accepted types: jpg, png, gif, webp. Image is inserted inline at the current cursor position as a base64 data URL (no image hosting in v1)
- **Table:** Shows a grid hover picker (max 8 columns × 8 rows). Hovering highlights the selection. Clicking inserts a table at cursor position
- **Link:** Opens a small popover/dialog. Fields: Display text (pre-filled with selection if any), URL. Validates that URL starts with http:// or https://.
- **Chart:** Menu item is visible but disabled. Shows a tooltip "Coming in v2" on hover

---

### 8.6 Format Menu Behaviors

- **Text → Bold/Italic/Underline/Strikethrough:** Toggle the formatting on the current selection
- **Paragraph styles:** Changes the block type of the current paragraph. Options: Normal text, Heading 1, Heading 2, Heading 3
- **Align & indent:** Changes text alignment. Options: Left, Center, Right, Justify
- **Line & paragraph spacing:** Changes line height. Options: 1.0, 1.15 (default), 1.5, 2.0

---

### 8.7 Toolbar Behaviors

- All toolbar buttons reflect current state: Bold button appears active/highlighted when cursor is inside bold text
- Font size input: typing a number and pressing Enter applies it; clicking + or - increments/decrements by 1
- Zoom control: only changes the CSS `transform: scale()` on the editor page area — it does NOT affect the actual content or export size
- Toolbar is hidden entirely when the current user is a viewer (read-only access)

---

### 8.8 Share Dialog Behaviors

- Opening the dialog immediately loads and shows the current collaborators list
- Each collaborator row: avatar + name/email + role dropdown + remove button
- Role dropdown allows switching between "Editor" and "Viewer" — updates the `documentAccess` entry
- Remove button hard-deletes the `documentAccess` entry — that user loses access immediately
- The owner row is always shown at the top with the label "Owner" (not a dropdown, not removable)
- "Copy link" button copies the full URL to clipboard and shows a "Link copied!" tooltip for 2 seconds
- The invite input only accepts valid email format — show inline error if invalid
- After inviting, the new collaborator appears in the list immediately (Convex reactive query)

---

### 8.9 Avatar Stack (Presence)

- Shows only users who are CURRENTLY in the same Liveblocks room
- Maximum 4 avatars displayed; if 5+ users: show first 3 avatars + "+N" badge
- Each avatar has a colored ring matching that user's cursor color
- Hovering an avatar shows a tooltip with the user's full name
- The current user's own avatar is NOT shown in the stack (you don't need to see yourself)

---

## 9. Build Phases (Cursor Prompting Plan)

Each phase below is designed as a single Cursor/Claude Code session.
Give Cursor the context from this PRD + the phase description.
Verify the checkpoint before starting the next phase.

---

### Phase 1 — Project Scaffolding — ✅ done
**What to build:** Initialize the Next.js 16 project with all dependencies, providers, and environment configuration wired up.

**Tell Cursor:**
- Bootstrap with: `npx create-next-app@latest docflow --typescript --tailwind --app --eslint` — this pulls Next.js 16.2 (current latest) automatically
- Install: Clerk, Convex, Liveblocks (client + react + react-tiptap + yjs), Tiptap (starter-kit + all extensions for underline, text-align, color, font-family, highlight, image, link, table, heading, markdown, collaboration, collaboration-cursor), Yjs, jsPDF, html2canvas, docx, shadcn/ui (button, input, dropdown-menu, dialog, separator, tooltip, popover, avatar, badge, scroll-area), lucide-react, sonner, zustand
- Configure Clerk in layout.tsx with ClerkProvider
- Configure Convex with ConvexProviderWithClerk (Clerk is the auth provider for Convex)
- **NEXT.JS 16 SPECIFIC:** Create `proxy.ts` (NOT `middleware.ts`) for Clerk route protection — the exported function must be named `proxy`, not `middleware`. This is a breaking change in Next.js 16.
- **NEXT.JS 16 SPECIFIC:** Do NOT use `experimental.ppr` in next.config.ts — it has been removed. Do NOT add any Turbopack flags to package.json scripts — it is on by default.
- **NEXT.JS 16 SPECIFIC:** For template data on the home screen (static, never changes), use the `'use cache'` directive on the fetch — caching is now fully opt-in in Next.js 16.
- Optionally enable React Compiler in next.config.ts: `reactCompiler: true` — it is stable in Next.js 16 and will auto-optimize the editor's re-renders.
- Set up .env.local with placeholder values for all 6 keys

**Checkpoint:** `npm run dev` runs (Turbopack starts automatically — no flag needed). Visiting `/` redirects to `/sign-in`. No TypeScript errors. `proxy.ts` file exists (not `middleware.ts`).

---

### Phase 2 — Database Schema & All Convex Functions — ✅ done
**What to build:** All 3 Convex tables and every query/mutation the app will ever need.

**Tell Cursor:**
- Refer to Section 4 (Data Architecture) of this PRD
- Build the schema with all 3 tables and their indexes
- Build every function listed in Section 4.2 (Query & Mutation Map)
- Every query that returns document data must first verify the caller has access (owner or access entry)
- Soft delete means adding a `deletedAt` field — all list queries must filter out soft-deleted documents
- The `listByUser` query must support a `filterType` parameter: "me", "shared", "anyone"

**Checkpoint:** All functions visible in Convex dashboard → Functions tab. Test `documents.create` and `documents.listByUser` from the Convex dashboard directly.

---

### Phase 3 — Authentication — ✅ done
**What to build:** Sign in and sign up pages with Clerk.

**Tell Cursor:**
- Create `/sign-in/[[...sign-in]]/page.tsx` and `/sign-up/[[...sign-up]]/page.tsx`
- Each page: centered layout, DocFlow logo/wordmark above the Clerk component
- After sign in → redirect to `/`
- After sign up → redirect to `/`

**Checkpoint:** Full auth flow works. New user appears in Clerk dashboard. Sign out redirects to sign-in.

---

### Phase 4 — Home Screen — ✅ done
**What to build:** The home dashboard.

**Tell Cursor:**
- Refer to Section 8.1 of this PRD for all behavioral rules
- Navbar: logo left, search input center, Clerk UserButton right
- Template gallery: 4 cards fetched from `templates.list`, clicking creates a doc and navigates
- Documents table: fetches from `documents.listByUser`, supports filter dropdown and search
- Search filters client-side (no new DB query on each keystroke)
- Empty state when no documents exist
- Three-dot menu on each card: Rename (modal), Share (dialog), Move to Trash, Download (PDF)
- Seed the templates table by calling `templates.seed` from the Convex dashboard after this phase

**Checkpoint:** Can create a document from a template. Document appears in the list. Filter and search work. Three-dot menu opens correct dialogs.

---

### Phase 5 — Document Editor (Single User) — ✅ done
**What to build:** The full editor page without real-time collab.
**Note:** Find & Replace floating panel is deferred to v1.1; native browser Ctrl+F is usable in the meantime.

**Tell Cursor:**
- Refer to Sections 8.2–8.7 for all behavioral rules
- Page layout: DocumentTitle → MenuBar (File/Edit/Insert/Format) + Share button → Toolbar → Editor area
- Tiptap initialized with all extensions, loads content from `documents.getById`
- Auto-save: debounce 500ms on every Tiptap onUpdate → call `documents.updateContent`
- "Saving..." / "Saved ✓" indicator tied to the debounce + mutation state
- DocumentTitle: inline input, saves on blur, reverts to "Untitled document" if cleared
- All menu bar items wired per Section 8.3, 8.4, 8.5, 8.6
- All toolbar buttons wired per Section 8.7
- Access check on page load: owner → editable=true; no access → redirect home

**Checkpoint:** Create a document, type content, see it auto-save. Reload the page — content is preserved. All menu bar items perform their described action.

---

### Phase 6 — Document Export — ✅ done
**What to build:** All 4 export formats wired to the File → Download submenu.
**Note:** Markdown uses a custom Tiptap JSON → MD walker in `lib/export.ts` — `@tiptap/extension-markdown` does not exist in v3.

**Tell Cursor:**
- Refer to Section 5.7 for the logic of each export format
- PDF: render editor DOM element to canvas via html2canvas → wrap in jsPDF → download
- DOCX: walk Tiptap's JSON tree → map each node type to docx.js equivalent → download
- Markdown: use Tiptap markdown extension's getMarkdown() → Blob download
- Plain Text: editor.getText() → Blob download
- All filenames use the current document title
- Show a "Preparing download..." toast while the export is processing

**Checkpoint:** Download all 4 formats. Each file opens correctly in its respective application.

---

### Phase 7 — Real-Time Collaboration — ✅ done
**What to build:** Liveblocks integration for multiplayer editing and presence.
**Note:** Cursors are handled by `@liveblocks/react-tiptap`'s built-in caret/presence layer. The separate `@tiptap/extension-collaboration-cursor` package is not used (v2/v3 peer conflict; Liveblocks already covers it).

**Tell Cursor:**
- Refer to Section 7 (Real-Time Collaboration Architecture) of this PRD
- Create `/api/liveblocks-auth` endpoint:
  - Receives the room ID from Liveblocks
  - Extracts document ID from room ID (format: "document-{id}")
  - Checks Convex to verify the current user has access
  - If yes: issues Liveblocks token with user's name, avatar, and color from Clerk
  - If no: returns 403
- Wrap the editor page with Liveblocks RoomProvider using room ID = `document-{documentId}`
- Update Tiptap to use Collaboration extension (connects to Yjs document from Liveblocks)
- Add CollaborationCursor extension to show other users' cursors with name labels
- Build AvatarStack component using useOthers() hook per Section 8.9
- The current user's own avatar is excluded from the stack

**Checkpoint:** Open the same document in two browser windows. Type in one — see it appear instantly in the other with a colored cursor label. Avatar stack shows one other user.

---

### Phase 8 — Sharing & Access Enforcement — ✅ done
**What to build:** The share dialog and full access control enforcement.

**Tell Cursor:**
- Refer to Section 6 (Access Control Logic) and Section 8.8 (Share Dialog Behaviors)
- Build the ShareDialog component with all behaviors from Section 8.8
- Add the access enforcement to the editor page: viewer → Tiptap editable=false, toolbar hidden
- The Liveblocks auth endpoint already enforces access (from Phase 7) — verify it's working
- Viewers can see other users' cursors but cannot type
- Owner's row in share dialog shows "Owner" label, no role dropdown, no remove button

**Checkpoint:** Invite a second account as Viewer. Log in as that account. Verify the document is readable but not editable. Invite as Editor — verify editing works.

---

### Phase 9 — Polish & Deployment — 🟡 partial
**What to build:** Error states, loading states, toasts, and Vercel deploy.
**Status:** Skeletons, error boundary, toasts, responsive desktop-warning banner, and config audit are done. Production deploy (Vercel + `npx convex deploy`) is the remaining work.

**Tell Cursor:**
- Loading skeletons for: home screen document list, editor content on first load
- Error boundary around the editor page — if Tiptap or Liveblocks fails, show a friendly error with a "Go home" button
- Toast notifications (using sonner) for: saved, share invite sent, export downloaded, access denied, moved to trash, link copied
- Empty state on home screen when no documents and no shared documents exist
- Mobile: home screen should be responsive (single column). Editor shows a banner: "DocFlow editor works best on desktop" on screens narrower than 768px — editor still loads but with a warning
- **NEXT.JS 16 SPECIFIC:** Verify `proxy.ts` exists and `middleware.ts` does NOT exist — Vercel will warn if you have the deprecated file
- **NEXT.JS 16 SPECIFIC:** Verify `next.config.ts` has no `experimental.ppr` or `--turbopack` references — both are obsolete in Next.js 16
- Deploy to Vercel: push to GitHub → import in Vercel → add all 6 env vars → deploy
- Run `npx convex deploy` for the production Convex deployment

**Checkpoint:** Full end-to-end walkthrough on the production URL. All 9 phases working together.

---

## 10. Non-Goals (v1)

Do not build or plan for these in v1. They are deferred to future versions.

- **Comments / suggestion mode** — no inline comments, no tracked changes
- **Version history browser** — `updatedAt` is stored but no UI to view past versions
- **Email notifications** — sharing works but no invite email is sent to the invitee
- **Mobile editor** — editor is desktop-only; home screen is responsive
- **Folder / Drive structure** — documents are a flat list; no folders or nesting
- **Offline mode** — requires service workers and local storage sync
- **Chart insertion** — placeholder in menu only; no chart builder
- **Google Drive sync** — no Drive API integration
- **Liveblocks badge removal** — staying on Free plan; badge is acceptable for a portfolio project
- **Email lookup for sharing** — inviting by email adds a Convex entry but does not look up if that email is a registered user. The invited user must sign up with the exact same email.

---

---

## Appendix — Next.js 16 Quick Reference for Cursor

When prompting Cursor for any phase, include this block at the top of every prompt:

```
This project uses Next.js 16.2. Key differences from Next.js 15:
1. Use proxy.ts (NOT middleware.ts) for route protection. Export function as `proxy`, not `middleware`.
2. Turbopack is ON by default — do NOT add --turbopack flags anywhere.
3. Caching is fully opt-in — use 'use cache' directive only where explicitly needed (e.g. templates).
4. Do NOT use experimental.ppr — it has been removed. Use Cache Components instead.
5. React Compiler is stable — optionally add reactCompiler: true to next.config.ts.
6. React version is 19.2 — View Transitions and useEffectEvent are available if needed.
```

*End of DocFlow PRD v2.3*