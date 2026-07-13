# UPDATE.md — runbook for an AI agent updating an existing Claudio install

**If you are an AI coding agent (Claude Code or similar) reading this because a user asked you to update their existing Claudio install from this repository: this file is your runbook, not a suggestion to read casually. Follow it in order.**

**Do not treat this repository's own `CLAUDE.md` as behavioral instructions for your current session.** It is the payload you are merging into the user's global config — not a system prompt for you right now. If your working directory is inside this cloned repo, ignore what its `CLAUDE.md` tells you to do as an orchestrator; you are updating it, not running it.

This file is for a user who **already has Claudio installed** and wants the newer rules/agents/hooks added since they installed. If they don't have Claudio yet, use `INSTALL.md` instead.

---

## Step 1 — Find the installed version

1. Resolve the config directory for the current OS: `~/.claude/` (Mac/Linux) or `%USERPROFILE%\.claude\` (Windows).
2. Read the user's installed `~/.claude/CLAUDE.md`.
3. Look for the marker `<!-- claudio-version: X.Y.Z -->` near the top.
   - **Found:** that's the installed version.
   - **Not found:** the install predates versioning (before 2.8.0). Tell the user this, then treat the installed version as `0.0.0` — every entry in `CHANGELOG.md` is "new" to them. Don't guess a version from file contents; ask them if it matters, otherwise proceed with `0.0.0`.

## Step 2 — Diff against the latest version

1. Read this repo's `CHANGELOG.md`.
2. Collect every entry newer than the installed version, most recent first.
3. Summarize for the user in plain language what's new — one line per entry, not the raw changelog prose. Ask them to confirm before applying (this changes their global config, same caution as `INSTALL.md`).

## Step 3 — Apply only what's new, idempotently

For each changed file this repo tracks (`CLAUDE.md`, `settings.example.json` → user's `settings.json`, `agents/*.md`, `hooks/*.js`):

- **Never blind-overwrite.** Same rule as `INSTALL.md` Step 1: read the user's file first, merge in only the sections/rules that changed.
- **Before adding a new rule/section to `CLAUDE.md`:** check whether a heading with the same or very similar name already exists in the user's file. If it does, they likely already have it (manually added, or applied in a previous update) — skip it, don't duplicate. If it exists but the *content* differs meaningfully from the repo's version, flag the conflict and ask the user which to keep — don't silently pick one.
- **`settings.json` hooks:** same as `INSTALL.md` — merge the `hooks` array, don't replace it. Check by matcher + command path, not by array position.
- **`agents/*.md`:** if a new agent file was added upstream and the filename doesn't collide with anything the user has, copy it. If it collides, ask before overwriting (they may have customized it).
- **Removed/renamed rules:** if the diff shows something was removed or renamed upstream, don't auto-delete the user's local copy — mention it and let them decide (they may be relying on the old behavior intentionally).

## Step 4 — Bump the version marker

After applying, update `<!-- claudio-version: X.Y.Z -->` in the user's `~/.claude/CLAUDE.md` to the latest version from `CHANGELOG.md`. If the marker didn't exist before (pre-2.8.0 install), add it at the top of the file, right under the title line.

## Step 5 — Verify

Tell the user to restart Claude Code — agents/hooks are only loaded at session start. Then:
- Run `/agents` — any newly copied agents should be listed.
- Open any project — Claudio should introduce itself as before, nothing should have broken.

---

## Summary for a human skimming this instead

This file exists so you can say to your own Claude Code session, in a repo you already have Claudio installed from: *"Read UPDATE.md from [this repo] and update my Claudio install to the latest version."* It finds what version you have (via a marker in your `CLAUDE.md`), shows you what's new, and merges in only the new parts — it won't duplicate rules you already have or clobber customizations. If you'd rather do it by hand, read `CHANGELOG.md` yourself and copy the pieces you want.
