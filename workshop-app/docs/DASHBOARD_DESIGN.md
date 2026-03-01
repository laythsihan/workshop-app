# Dashboard Design

A standard SaaS-style dashboard: single column with tabs to switch between "My documents" and "Invited to review."

---

## 1. Dashboard Layout (Single Column + Tabs)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [≡] Document Workshopping                         [Sign in / user menu]  │
├──────────────┬──────────────────────────────────────────────────────────┤
│ Workshop     │  Welcome back, [Name]                                     │
│ Main         │  Manage your documents and reviews in one place.          │
│  Dashboard   │                                                           │
│  New Document│  ┌─────────────────────────────────────────────────────┐  │
│              │  │ [My documents]  [Invited to review]                 │  │
│              │  ├─────────────────────────────────────────────────────┤  │
│              │  │                                                     │  │
│              │  │  (Content for active tab: list or empty state)      │  │
│              │  │                                                     │  │
│              │  └─────────────────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────────────────┘
```

- **Left sidebar**: Dashboard (home) and New Document (upload).
- **Main area**: Single column with horizontal tabs at the top.
- **Tab 1 – My documents**: Documents you uploaded. Primary action: Upload document.
- **Tab 2 – Invited to review**: Documents others shared with you for feedback.

---

## 2. My Documents Tab – With Documents

When the user has uploaded documents:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [My documents]  [Invited to review]                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Gumbo.docx          DRAFT      Feb 13, 2026              [Open]        │
│  Proposal.pdf        IN_REVIEW  Feb 12, 2026              [Open]        │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  [+ Upload document]                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

- Each row: filename, status badge, date, “Open” action.
- Click filename or Open → document viewer page (future).
- Footer: “Upload document” button for quick access.

---

## 3. My Documents Tab – Empty State

When there are no documents:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [My documents]  [Invited to review]                                      │
├─────────────────────────────────────────────────────────────────────────┤
│           [dashed border area]                                          │
│                    [File icon]                                          │
│              No documents yet                                           │
│        Upload a document to get started.                                │
│                                                                         │
│             [+ Upload document]                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

- Shown only when the list is empty.
- Primary action: “Upload document” (links to `/documents/new`).

---

## 4. Upload Flow & Success Feedback

### Option A: Toast (recommended)

- After a successful upload:
  - Show a toast: “Gumbo.docx uploaded successfully.”
  - Redirect to dashboard.
- Toast:
  - Position: bottom-right.
  - Style: success (green check icon).
  - Auto-dismiss after ~4 seconds.

**Implementation**: Add `sonner` (or shadcn toast) and a `<Toaster />` in the root layout. Call `toast.success("...")` in `UploadForm` before redirect.

### Option B: Inline success on upload page

- Show: “Upload successful. Redirecting to dashboard…” for 1.5s, then redirect.
- Simpler, but user stays on upload page briefly.

**Recommendation**: Option A (toast) for a cleaner, consistent experience.

---

## 5. New Document Page (`/documents/new`)

- Keep current layout: heading + drag‑and‑drop upload form.
- On success:
  - Show toast with filename.
  - Redirect to dashboard.
  - Dashboard shows the new document in the "My documents" tab.

---

## 6. Invited to Review Tab

- Empty: “No documents to review. Documents shared with you will appear here.”
- With documents: same row format (filename, status, date, Open).
- No upload CTA in this tab (upload only applies to "My documents").

---

## 7. Visual Summary

| Element                 | Location                     | Behavior                                      |
|-------------------------|-----------------------------|-----------------------------------------------|
| Tabs                    | Top of main content         | My documents \| Invited to review                 |
| My documents (list)     | Content area, active tab    | Fetched from `document.listMine`, links to viewer |
| My documents (empty)    | Content area                | Shown only when list is empty                 |
| Invited to review       | Content area, active tab    | Fetched from `document.listReviewing`         |
| Upload button           | My documents tab only       | Links to `/documents/new`                     |
| Success toast           | Bottom-right overlay        | After upload: "{filename} uploaded successfully" |
| Document rows           | Either tab                  | Filename, status badge, date, Open button     |

---

## 8. Implementation Order

1. Add toast provider (`sonner` or shadcn toast) to root layout.
2. Add tabbed UI to dashboard (My documents | Invited to review).
3. Fetch and render "My documents" content (list vs empty state).
4. Fetch and render "Invited to review" content (list vs empty state).
5. Add success toast in `UploadForm` before redirect.
6. Add document row component for consistent display.
7. Wire "Open" to `/documents/[id]` (viewer) when ready.
