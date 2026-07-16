---
name: stale-mirrors-of-claude-md
description: Files that copy operative formats from CLAUDE.md drift silently; check for new copies rather than assuming the old ones
metadata:
  type: project
---

Files in this repo have twice restated an operative format from `CLAUDE.md` as an illustrative example instead of pointing at it, and both times the copies drifted without anyone noticing — nothing auto-syncs them, and they don't appear in `git show` for the session that made them stale.

Both original instances are now fixed, so don't re-check them expecting to find the old bugs:

- **Batched session-close menu** — was restated in `README.md`, `docs/how-it-works.md` and `agents/ARCHITECTURE.md`; all three sat at a five-option menu for months after the real one grew to seven. Fixed 2026-07-16: the menu became an `AskUserQuestion` and the three mirrors became pointers to `CLAUDE.md` → "Session close procedure". The drift class is gone, not just the instance.
- **Log section formats** — `templates/_log_template.md` shipped a 3-column `DECISIONS MADE` table after CLAUDE.md moved to the compact one-line format. Verified fixed 2026-07-16; the template now matches.

**How to apply:** the lesson survives its instances. When a session's diff changes an operative format in `CLAUDE.md` (a menu, a required block, a section shape), grep the whole repo for a distinctive phrase from the *old* text before approving — a copy that nobody edited is exactly the copy that just went stale. And when reviewing a diff that *adds* a format to `CLAUDE.md`, check whether it's being written in a second place at the same time; that's the moment the next mirror is born.
