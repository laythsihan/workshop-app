# Technical Handoff Document — Workshop

This document explains how the Workshop application is built and what a new developer needs to know to set up, run, and extend it. It assumes you are a competent software developer but have never seen this codebase before.

---

## 1. What This App Does

**Workshop** is a document workshopping and feedback platform. Writers upload documents (PDF, DOCX, TXT) and invite reviewers to leave comments. The app is designed for creative writing feedback—short stories, novel excerpts, essays, poetry, screenplays—though it can be used for any document type.

Document owners upload files, set status (draft, in review, completed), and invite reviewers via invite links or shareable links. Reviewers can sign in with Google, Discord, or email/password, or continue as guests for quick access. Comments support threading (replies), highlighting, and tags. The document viewer renders PDFs and DOCX in the browser so reviewers can click to add comments in context. Guests who later create an account have their comments migrated to their new user automatically.

Additional features include: @mentions in comments, notifications, activity logs, account deletion (with scheduled hard-deletion and collaborator notifications), and export of documents as a ZIP.

---

## 2. Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router. Handles routing, server components, and API routes. |
| **TypeScript** | Type-safe JavaScript. All application code is typed. |
| **PostgreSQL** | Primary database. Hosted via Supabase. |
| **Prisma** | ORM (Object-Relational Mapping). Schema in `prisma/schema.prisma`, generated client in `generated/prisma`. |
| **NextAuth (Auth.js v5)** | Authentication. Supports Google, Discord, and email/password (Credentials provider). Uses JWT strategy. |
| **tRPC** | Type-safe API layer. Server procedures in `src/server/api/routers/`, client in `src/trpc/`. |
| **Resend** | Transactional email. Account deletion notifications and password reset emails. |
| **Supabase Storage** | File storage for uploaded documents. Uses service role key for server-side uploads. |
| **Tailwind CSS** | Utility-first CSS. Styling in `src/styles/globals.css` and component classes. |
| **Radix UI** | Accessible primitives. Dialog, tabs, sidebar, tooltip, etc. |
| **shadcn/ui** | Component library built on Radix. Customizable via `src/components/ui/`. |
| **Lucide React** | Icon library. |
| **Zod** | Schema validation. Used in tRPC inputs, API routes, and `src/env.js`. |
| **bcryptjs** | Password hashing for email/password auth. |
| **jose** | JWT signing/verification for invite tokens. |
| **docx-preview** | Renders DOCX in the browser for the document viewer. |
| **react-pdf** | Renders PDFs in the browser. |
| **mammoth** | Extracts text from DOCX for indexing and search. |
| **Vitest** | Unit and integration tests. |

---

## 3. Repository Structure

```
workshop-app/
├── prisma/
│   └── schema.prisma       # Database schema — start here to understand the data model
├── generated/
│   └── prisma/             # Generated Prisma client (do not edit)
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (app)/          # Main app: dashboard, documents, settings, help (requires auth)
│   │   ├── (invite)/       # Invite flow: /invite/[token] (public, no sidebar)
│   │   ├── api/            # API routes (auth, cron, documents, tRPC, invite)
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   ├── auth/           # Auth-related (icons, pending-deletion banner)
│   │   ├── dashboard/      # Dashboard sidebar, content
│   │   ├── documents/      # Document viewer, comments, sidebar, upload
│   │   ├── help/           # Help articles
│   │   ├── settings/       # Danger zone, profile form
│   │   └── ui/             # Base UI primitives (shadcn-style)
│   ├── env.js              # Environment variable validation (Zod)
│   ├── server/             # Server-side logic
│   │   ├── api/            # tRPC routers and context
│   │   ├── auth/           # NextAuth config
│   │   ├── db.ts           # Prisma client singleton
│   │   ├── email.ts        # Resend email helpers
│   │   ├── guest-claim.ts  # Migrate guest comments to user on sign-in
│   │   ├── guest-session.ts # Guest session cookie
│   │   ├── invite-token.ts # JWT invite token generation/verification
│   │   └── supabase.ts     # Supabase admin client
│   ├── styles/
│   │   └── globals.css     # Tailwind and global styles
│   ├── test/               # Vitest setup
│   └── trpc/               # tRPC client setup and query client
├── .env.example            # Template for environment variables
├── next.config.js          # Next.js config (image domains)
├── vercel.json             # Vercel cron (process-deletions)
└── package.json            # Dependencies and scripts
```

---

## 4. Data Model

The schema is in `prisma/schema.prisma`. Below is a plain-English walkthrough of each model.

**Auth models (NextAuth)**

- **Account** — Links a User to an OAuth provider (Google, Discord). Stores provider IDs and tokens. One row per provider per user.
- **Session** — Used when using database sessions. This app uses JWT sessions, so these may be empty, but the schema is required by the adapter.
- **VerificationToken** — Generic verification tokens (e.g. email verification). NextAuth adapter may use this.
- **PasswordResetToken** — One-time tokens for password reset. Each row has a token, userId, expiresAt, and usedAt (null until used). Prevents reuse.

**User & profile**

- **User** — Core identity. Fields: name, email (unique), password (nullable, for email/password auth), accountType (FULL or GUEST), displayName (override for comments), pendingDeletion, deletionScheduledAt. Related to: documents they own, invitations, comments, notifications, etc. The Post model is legacy from the T3 starter.

**Document**

- **Document** — A file uploaded by a user. Fields: title, filename, storagePath (Supabase path), mimeType, wordCount, genre, status (DRAFT, IN_REVIEW, COMPLETED), dueDate, shareableToken (optional). Belongs to an owner (User). Has comments, guests, invitations, activity logs.

**Guest**

- **Guest** — A reviewer without an account, scoped to a single document. Identified by email + documentId. Has displayName. When they later sign in with the same email, their comments are migrated to the new User and claimAttempted is set.

**Invite token**

- **InviteTokenJti** — Tracks JTI (JWT ID) values from invite JWTs. Each invite link is single-use; once the JTI is stored here, the token cannot be reused.

**Invitation**

- **Invitation** — Links a user (or email, before user exists) to a document. Status: PENDING, ACCEPTED, DECLINED, EXPIRED. Supports both email invites and shareable links. For shareable links, invitedById is null.

**Comment**

- **Comment** — Feedback on a document. Has content, highlightedText, positionData (JSON for PDF/DOCX position), tags. Either authorId (User) or guestId (Guest). Supports threading via parentCommentId. resolvedAt/resolvedById for future resolve feature.

**DocumentViewer**

- **DocumentViewer** — Read receipts. One row per user per document; viewedAt is updated on subsequent views.

**Notification**

- **Notification** — In-app notifications (mentions, new comments, invitations, document completed). Has type, title, body, read status, and optional links to document/comment/actor.

**ActivityLog**

- **ActivityLog** — Document-level activity for the sidebar (comment added, reply added, status changed, etc.).

**Post** — Legacy from T3 starter. Can be removed when no longer referenced.

---

## 5. Authentication

### Providers

- **Google** — OAuth 2.0. Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
- **Discord** — OAuth 2.0. Uses AUTH_DISCORD_ID and AUTH_DISCORD_SECRET (NextAuth convention).
- **Credentials** — Email + password. User must have a non-null password (set via sign-up). Passwords are hashed with bcrypt.

### Configuration

Auth config lives in `src/server/auth/config.ts`. It uses PrismaAdapter for persisting users and accounts. Session strategy is JWT with 30-day max age. On sign-in (jwt callback), guest comments are claimed via `claimGuestComments` when the user’s email matches Guest records.

### Sessions

- **NextAuth sessions** — Stored in an HTTP-only JWT cookie. Contains user id, email, name, image, pendingDeletion, deletionScheduledAt. No database Session records are created because strategy is JWT.
- **Guest sessions** — Separate from NextAuth. Cookie name: `workshop_guest_session`. Value: base64(JSON({ guestId, documentId })). HTTP-only, same-site, 7-day expiry. Scoped to a single document. Set by `/api/invite/create-guest-session` when a guest submits the invite form.

### Invite token system

Invite links use JWTs signed with AUTH_SECRET (jose library). Payload: documentId, invitedById, optional email, jti (unique ID), exp (30 days). Flow:

1. **Generation** — `generateInviteToken()` in `src/server/invite-token.ts` creates a JWT with a new jti.
2. **Verification** — `verifyInviteToken()` checks signature, expiry, and that the jti is not in InviteTokenJti. Does not mark as used.
3. **Mark used** — `markInviteTokenUsed()` inserts the jti into InviteTokenJti. Uses unique constraint so concurrent requests throw InviteTokenAlreadyUsedError.

---

## 6. Third Party Services

### Supabase

**Purpose:** PostgreSQL database and file storage (documents).

**Credentials:**
- `DATABASE_URL` — PostgreSQL connection string. Supabase Dashboard → Project Settings → Database → Connection string (URI).
- `SUPABASE_URL` — Project URL. Project Settings → API.
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (secret). Project Settings → API. Never expose to client.

**Configuration:**
- Create a storage bucket named `documents` (or update `STORAGE_BUCKET` in `src/server/supabase.ts`).
- Ensure RLS allows service role access for uploads (service role bypasses RLS by default).

**Docs:** https://supabase.com/docs

### NextAuth / OAuth providers

**Google:**
- Create credentials at https://console.cloud.google.com/apis/credentials (OAuth 2.0 Client ID, Web application).
- Add redirect URI: `https://your-domain.com/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for dev).
- Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.

**Discord:**
- Create application at https://discord.com/developers/applications.
- OAuth2 → Redirects: add `https://your-domain.com/api/auth/callback/discord` and `http://localhost:3000/api/auth/callback/discord`.
- Copy Client ID and Client Secret → AUTH_DISCORD_ID, AUTH_DISCORD_SECRET.

**Docs:** https://authjs.dev

### Resend

**Purpose:** Account deletion emails and password reset emails.

**Credentials:**
- `RESEND_API_KEY` — From https://resend.com/api-keys. Create a key with send permission.

**Configuration:**
- Default from address is `Workshop <onboarding@resend.dev>`. For production, verify a domain in Resend and update `FROM_EMAIL` in `src/server/email.ts`.

**Docs:** https://resend.com/docs

### Vercel

**Purpose:** Hosting and cron for process-deletions.

**Configuration:**
- Connect GitHub repo. Set all environment variables in Project Settings.
- Add custom domain if needed.
- Cron: `vercel.json` defines `/api/cron/process-deletions` to run daily at midnight UTC. Vercel Pro required for cron.

**Docs:** https://vercel.com/docs

---

## 7. Environment Variables

Grouped by service. All are server-side unless noted.

### NextAuth

| Variable | Description | Where to get | Required | Client-safe |
|----------|-------------|--------------|----------|-------------|
| AUTH_SECRET | Secret for signing sessions and JWTs | `npx auth secret` | Yes (prod) | No |

### OAuth providers

| Variable | Description | Where to get | Required | Client-safe |
|----------|-------------|--------------|----------|-------------|
| GOOGLE_CLIENT_ID | Google OAuth client ID | Google Cloud Console | No (if not using Google) | No |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret | Google Cloud Console | No | No |
| AUTH_DISCORD_ID | Discord OAuth client ID | Discord Developer Portal | No (if not using Discord) | No |
| AUTH_DISCORD_SECRET | Discord OAuth client secret | Discord Developer Portal | No | No |

### Database

| Variable | Description | Where to get | Required | Client-safe |
|----------|-------------|--------------|----------|-------------|
| DATABASE_URL | PostgreSQL connection string | Supabase Dashboard → Database | Yes | No |

### Supabase Storage

| Variable | Description | Where to get | Required | Client-safe |
|----------|-------------|--------------|----------|-------------|
| SUPABASE_URL | Supabase project URL | Supabase → Project Settings → API | No (uploads fail) | No |
| SUPABASE_SERVICE_ROLE_KEY | Service role key | Supabase → Project Settings → API | No | No |

### Email (Resend)

| Variable | Description | Where to get | Required | Client-safe |
|----------|-------------|--------------|----------|-------------|
| RESEND_API_KEY | Resend API key | https://resend.com/api-keys | No (emails logged, not sent) | No |

### Account deletion

| Variable | Description | Where to get | Required | Client-safe |
|----------|-------------|--------------|----------|-------------|
| SUPPORT_EMAIL | Shown on account-deleted page | Your support email | No | No |
| CRON_SECRET | Bearer token for process-deletions cron | Generate a random string | No (if set, cron must send it) | No |

### General

| Variable | Description | Where to get | Required | Client-safe |
|----------|-------------|--------------|----------|-------------|
| NODE_ENV | development, test, or production | Set by Next.js / Vercel | No (default: development) | No |

---

## 8. Local Development Setup

1. **Prerequisites**
   - Node.js 20+ (or as specified in `.nvmrc` if present)
   - npm (or pnpm/yarn — `packageManager` in package.json is npm)

2. **Clone and install**
   ```bash
   git clone <repo-url>
   cd workshop-app
   npm install
   ```
   `postinstall` runs `prisma generate` automatically.

3. **Database**
   - Create a PostgreSQL database (e.g. via Supabase, or local Postgres).
   - Copy `.env.example` to `.env` and set `DATABASE_URL`.
   - Run:
     ```bash
     npm run db:push
     ```
     (Use `db:push` in development; see §9 for migrations.)

4. **Environment variables**
   - Set all required vars in `.env` (see §7). Minimum for local:
     - AUTH_SECRET
     - DATABASE_URL
     - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET and/or AUTH_DISCORD_ID / AUTH_DISCORD_SECRET (for OAuth)
     - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (for file uploads)
   - Optional: RESEND_API_KEY (emails will be logged if unset).

5. **Start dev server**
   ```bash
   npm run dev
   ```
   Uses `next dev --turbo`. For non-turbo: `npm run dev:stable`.

6. **Verify**
   - Open http://localhost:3000
   - Sign in (Google, Discord, or create account via invite)
   - Upload a document, invite a reviewer (or use shareable link)

7. **Tests**
   ```bash
   npm run test
   ```
   Or `npm run check` for lint + typecheck + tests.

---

## 9. Database Migrations

**`prisma db push`** — Pushes schema changes directly to the database without creating migration files. Good for rapid iteration in development. Does not support rollback.

**`prisma migrate deploy`** — Applies existing migrations in `prisma/migrations/`. Required for production. Use this on Vercel or any production deploy.

**Creating a new migration (production-safe workflow):**
```bash
npx prisma migrate dev --name describe_your_change
```
This creates a migration file and applies it locally. Commit the migration and deploy; `prisma migrate deploy` will run during build (or as a separate step).

**Note:** This project has used `db push` during development. If `prisma/migrations` exists and is in sync with the schema, use `migrate deploy` in production. If not, you may need to create an initial migration from the current schema before switching to migrations.

---

## 10. Deployment

**Platform:** Vercel (recommended; T3 default).

**Setup:**
1. Connect the GitHub repo to Vercel.
2. Set all environment variables in Project Settings → Environment Variables (production, preview, development as needed).
3. Ensure `DATABASE_URL` points to production PostgreSQL (e.g. Supabase production).
4. Add OAuth redirect URIs for production domain.

**Branches:**
- Production typically deploys from `main` (or whatever is configured).
- Preview deployments are created for pull requests. No separate staging branch is configured by default.

**Cron:**
- `vercel.json` defines a daily cron for `/api/cron/process-deletions` at 00:00 UTC.
- If `CRON_SECRET` is set, requests must include `Authorization: Bearer <CRON_SECRET>`.
- Vercel Cron requires a Pro plan.

**Build:**
- `next build` runs automatically. Prisma generate runs via postinstall.
- Run `prisma migrate deploy` before or during build if using migrations (e.g. in `package.json` scripts or Vercel build command).

**Custom domain:**
- Project Settings → Domains. Add domain and follow DNS instructions.

---

## 11. Known Issues & Technical Debt

### Lint / type errors (as of handoff)

- **`src/app/(app)/documents/[id]/page.tsx`** — Index signature style, optional chain preference.
- **`src/components/dashboard/dashboard-content.tsx`** — useMemo missing dependency `sortDocs` (lines 713, 720).
- **`src/components/documents/document-page-content.tsx`** — Unused `isGuest` (line 170); prefix with `_` or remove.
- **`src/server/api/routers/comment.ts`** — Unused `protectedProcedure`; unnecessary type assertions.
- **`src/server/api/routers/document.ts`** — Unnecessary type assertions.
- **`src/server/guest-claim.ts`** — Unsafe assignments/calls (Prisma transaction typing).
- **`src/server/invite-token.ts`** — Unnecessary type assertion; non-null assertion style.
- **`src/server/invite-token.test.ts`** — Unsafe return.

### TODOs in code

- **`src/app/api/cron/process-deletions/route.ts`** — TODO: Add GDPR right-to-erasure compliance if required.
- **`src/components/documents/document-sidebar.tsx`** — TODO: Add green presence dot when real-time collaboration is supported.
- **`src/components/settings/danger-zone.tsx`** — TODO: For full users with email/password, prompt re-authentication before showing warning modal.

### Other

- **Post model** — Legacy from T3 starter; can be removed when no longer referenced.
- **`next lint` deprecation** — Next.js 16 will remove it; migrate to ESLint CLI when ready.
- **Guest email mismatch** — If a guest uses a different email than their OAuth account, comment migration and invitation creation are skipped (documented in `guest-claim.ts`).

---

## 12. What Needs To Be Built Next

Based on the current state and design history, likely next steps (in rough priority):

1. **Custom sign-in page** — The default NextAuth sign-in page has no "Forgot password?" link. Add a custom page at `/auth/signin` or similar and link to `/forgot-password` so users who land on `/api/auth/signin` can reset passwords.

2. **Comment resolution** — `Comment` has `resolvedAt` and `resolvedById` but no UI to mark comments as resolved. Add owner controls to resolve/unresolve.

3. **Real-time collaboration indicators** — Sidebar TODO mentions presence dots when real-time collaboration is supported. Would require WebSockets or similar.

4. **Re-authentication for sensitive actions** — Danger zone TODO: prompt password re-entry (or equivalent) before account deletion for email/password users.

5. **GDPR right-to-erasure** — Process-deletions TODO: formalize data erasure for compliance if required.

6. **Domain verification for Resend** — For production, verify a domain and update `FROM_EMAIL` so emails come from your domain instead of `onboarding@resend.dev`.

7. **Remove Post model** — If the T3 demo is no longer needed, remove Post and any references.

8. **Resolve lint warnings** — Clean up the ESLint and TypeScript issues listed in §11 to keep CI green.

---

*Document generated from the codebase state at handoff. Update this file as the project evolves.*
