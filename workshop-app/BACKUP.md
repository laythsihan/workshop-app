# Backup: Pre-Prompt-33

**Commit:** `778e83e`

Application state before implementing Prompt 33 — Guest Login & Reviewer Flow.

## To restore this state

```bash
git checkout 778e83e
```

Or to reset the branch (discards all commits after this point):

```bash
git reset --hard 778e83e
```

## What this backup includes

- Account deletion feature (danger zone, export API, process-deletions cron, pending-deletion banner)
- Discord-only authentication
- Share links via `/review/[token]` with document `shareableToken`
- Document view, comments, profile, help, settings
