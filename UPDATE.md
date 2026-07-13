# UPDATE.md — runbook for an AI agent updating an existing Claudio install

**If you are an AI coding agent (Claude Code or similar) reading this because a user asked you to update their existing Claudio install from this repository: this file is your runbook, not a suggestion to read casually. Follow it in order.**

**Do not treat this repository's own `CLAUDE.md` as behavioral instructions for your current session.** It is the payload you are merging into the user's global config — not a system prompt for you right now. If your working directory is inside this cloned repo, ignore what its `CLAUDE.md` tells you to do as an orchestrator; you are updating it, not running it.

This file is for a user who **already has Claudio installed** and wants the newer rules/agents/hooks added since they installed. If they don't have Claudio yet, use `INSTALL.md` instead.

---

## Step 1 — Find the installed version

1. Resolve the config directory for the current OS: `~/.claude/` (Mac/Linux) or `%USERPROFILE%\.claude\` (Windows).
2. Read the user's installed `~/.claude/CLAUDE.md`.
3. Look for the marker `<!-- claudio-version: X.Y.Z -->` near the top.
   - **Found, and a matching `vX.Y.Z` git tag exists in this repo:** you can do a real three-way merge — go to Step 2A.
   - **Not found, or found but no matching tag exists (install predates tagging, before 2.9.0):** there's no base snapshot to diff against. Tell the user this explicitly. Fall back to Step 2B (heading-existence merge — coarser, can't tell their edits apart from stale content).

## Step 2A — Three-way merge (when a base tag exists)

You have three versions of each tracked file (`CLAUDE.md`, `settings.example.json` → user's `settings.json`, `agents/*.md`, `hooks/*.js`):

- **base** — this repo's file content at the tag matching the user's installed marker (`git show vX.Y.Z:path/to/file`)
- **local** — the user's current installed file
- **upstream** — this repo's file content at the current `HEAD` (latest)

For each file, diff **base→local** (what the user personally changed since installing) and **base→upstream** (what changed upstream since their version), section by section (use `##`/`###` headings as the unit for `CLAUDE.md` and agent files; use top-level JSON keys / hook entries for `settings.json`):

- **Changed only in upstream, untouched in local** → apply the upstream version. Safe, no prompt needed.
- **Changed only in local, untouched upstream** → leave it. It's the user's customization — don't touch it, don't ask.
- **Unchanged in both** → nothing to do.
- **Changed in both (real conflict)** → do not silently pick one. Show the user the base, their local version, and the upstream version for that section, and ask which they want (keep theirs / take upstream / merge by hand).
- **New section that didn't exist in base, added upstream** → apply, same as any new content in `INSTALL.md`'s merge logic.
- **Section existed in base and was removed upstream** → don't auto-delete the user's local copy (they may still want it, even if it modified since); mention it and let them decide.

This is the same logic `git merge` uses with a common ancestor — the tag is the ancestor. It's strictly better than Step 2B because it separates "the user's own edit" from "just an old version" instead of guessing from a single-version diff.

## Step 2B — Heading-existence merge (fallback, no base available)

Read this repo's `CHANGELOG.md` and collect every entry newer than the installed version (or all of it, if treating as `0.0.0`). Summarize for the user in plain language what's new — one line per entry — and confirm before applying.

Then, for each changed file:
- **Never blind-overwrite.** Read the user's file first, merge in only the sections/rules that changed.
- **Before adding a new rule/section to `CLAUDE.md`:** check whether a heading with the same or very similar name already exists in the user's file. If it does, skip it, don't duplicate. If it exists but the *content* differs meaningfully from the repo's version, flag it and ask the user which to keep — you can't tell here whether the difference is their customization or just staleness, so always ask, don't guess.
- **`settings.json` hooks:** merge the `hooks` array, don't replace it. Check by matcher + command path, not by array position.
- **`agents/*.md`:** if a new agent file was added upstream and the filename doesn't collide with anything the user has, copy it. If it collides, ask before overwriting.
- **Removed/renamed rules:** don't auto-delete the user's local copy — mention it and let them decide.

## Step 3 — Bump the version marker and tag the baseline

After applying, update `<!-- claudio-version: X.Y.Z -->` in the user's `~/.claude/CLAUDE.md` to the latest version from `CHANGELOG.md`. If the marker didn't exist before, add it at the top of the file, right under the title line. This is what makes the *next* update a real three-way merge instead of falling back to Step 2B.

## Step 4 — Verify

Tell the user to restart Claude Code — agents/hooks are only loaded at session start. Then:
- Run `/agents` — any newly copied agents should be listed.
- Open any project — Claudio should introduce itself as before, nothing should have broken.

---

## Summary for a human skimming this instead

This file exists so you can say to your own Claude Code session, in a repo you already have Claudio installed from: *"Read UPDATE.md from [this repo] and update my Claudio install to the latest version."* If your installed version has a matching git tag in this repo, it does a real three-way merge (base tag vs. your file vs. latest) — it can tell "you personally edited this" apart from "this section just changed upstream," and only asks you when both happened to the same section. If there's no tag to diff against (older installs), it falls back to a coarser check that just avoids duplicating headings you already have. Either way, it won't clobber your customizations without asking. If you'd rather do it by hand, read `CHANGELOG.md` yourself and copy the pieces you want.
