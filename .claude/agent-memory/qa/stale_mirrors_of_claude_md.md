---
name: stale-mirrors-of-claude-md
description: Files that copy illustrative examples from CLAUDE.md and silently drift when CLAUDE.md changes but they aren't co-edited
metadata:
  type: project
---

Several files in this repo restate parts of `CLAUDE.md` as illustrative prose/examples instead of linking to it. They are not auto-synced, so any edit to the underlying CLAUDE.md rule must be manually checked against all of them:

- **Batched session-close menu** (`What do we process? [A] All [B] QA only ...`) is restated as an example in three places, not just defined once: `README.md` ("How a session looks"), `docs/how-it-works.md` ("The batched proposal at session close"), and `agents/ARCHITECTURE.md` ("Batched proposal format"). Confirmed 2026-07-10: when CLAUDE.md's menu grew from 5 to 7 options (Simplify added), all three mirrors were left showing the old 5-option version — a visible inconsistency in public onboarding docs.
- **Log section formats** (`DECISIONS MADE`, `KNOWN ISSUES`) are defined narratively in `CLAUDE.md` but also given a starting shape in `templates/_log_template.md` (the file Claudio actually scaffolds for new projects) and described again in `docs/how-it-works.md` ("PRODUCT.md as project anchor" / "Project memory" sections). Confirmed 2026-07-10: CLAUDE.md switched `DECISIONS MADE` to a compact one-line arrow format (`**[Title]** — context → decision → why`) and gave `KNOWN ISSUES` a required structured block (Occurrences/Symptom/Root cause/Mitigation/Status), but `templates/_log_template.md` still ships the old 3-column table (`| Decision | Reason | Date |`) and a bare `- ...` placeholder — so a newly scaffolded project log contradicts CLAUDE.md's own instructions for filling it in.

**How to apply:** whenever a session's diff touches the batched-proposal menu text or a log-section format rule in `CLAUDE.md`, grep the whole repo for the changed phrase (e.g. `"QA only"`, `"DECISIONS MADE"`) before approving QA — these mirrors won't show up in `git show <commit>` for that session since they weren't edited, but they become stale as a direct result of it.
