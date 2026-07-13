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
   - **Found, but no matching tag exists** (a fork without its own tags, or a canonical release that shipped without one): tell the user there's no base snapshot for their exact version. Fall back to Step 2B, treating their marker version as the "installed version" for the changelog summary.
   - **Not found** (install predates the marker, before 2.9.0): tell the user this explicitly, then treat the installed version as `0.0.0` for Step 2B — every changelog entry is "new" to them.

## Step 2A — Three-way merge (when a base tag exists)

You have three versions of each tracked file (`CLAUDE.md`, `settings.example.json` → user's `settings.json`, `agents/*.md`, `hooks/*.js`):

- **base** — this repo's file content at the tag matching the user's installed marker: `git show vX.Y.Z:path/to/file` (the only one of the three you need a git command for)
- **local** — the user's current installed file (read directly, no git needed)
- **upstream** — the file as it exists on disk in this cloned repo right now, at `HEAD` (also a plain read — you're already sitting in that checkout, don't `git show HEAD:...` it)

Before reasoning section-by-section, try a mechanical merge first: `git merge-file -p --diff3 <local> <base> <upstream>` (or `git merge-tree`). Everything that merges without `<<<<<<<` conflict markers is resolved for free — upstream-only changes and local-only changes both fold in automatically with zero ambiguity. You only need to reason, section by section, about the hunks the tool actually flags as conflicting:

- **Tool reports no conflict for a section** → trust it, move on. (Covers: changed only in upstream; changed only in local; unchanged in both; new section added upstream; section removed upstream but you still have local content — the merge tool keeps it, don't second-guess that.)
- **Tool reports a conflict** → check first whether local and upstream actually landed on the same resulting text (e.g. both independently fixed the same typo). If identical, apply it silently, no prompt. If they genuinely differ, don't silently pick one — show the user base, local, and upstream for that section and ask (keep theirs / take upstream / merge by hand).

This is strictly better than Step 2B because it separates "the user's own edit" from "just an old version" instead of guessing from a single-version diff — and doing the merge mechanically first means you only spend reasoning on sections that actually need a judgment call.

## Step 2B — Heading-existence merge (fallback, no base available)

Read this repo's `CHANGELOG.md` and collect every entry newer than the installed version determined in Step 1 (their marker version, or `0.0.0` if there was none). Summarize for the user in plain language what's new — one line per entry — and confirm before applying.

Then, for each changed file:
- **Never blind-overwrite.** Read the user's file first, merge in only the sections/rules that changed.
- **Before adding a new rule/section to `CLAUDE.md`:** check whether a heading with the same or very similar name already exists in the user's file. If it does, skip it, don't duplicate. If it exists but the *content* differs meaningfully from the repo's version, flag it and ask the user which to keep — you can't tell here whether the difference is their customization or just staleness, so always ask, don't guess.
- **`settings.json` hooks:** merge the `hooks` array, don't replace it. Check by matcher + command path, not by array position.
- **`agents/*.md`:** if a new agent file was added upstream and the filename doesn't collide with anything the user has, copy it. If it collides, ask before overwriting.
- **Removed/renamed rules:** don't auto-delete the user's local copy — mention it and let them decide.

## Step 3 — Bump the version marker

After applying, update `<!-- claudio-version: X.Y.Z -->` in the user's `~/.claude/CLAUDE.md` to the latest version from `CHANGELOG.md`. If the marker didn't exist before, add it at the top of the file, right under the title line. There's no git tag to create here — `~/.claude/` isn't this repo. The marker alone is what anchors the *next* update to a matching tag in the upstream repo, making it a real three-way merge instead of falling back to Step 2B.

## Step 4 — Verify

Tell the user to restart Claude Code — agents/hooks are only loaded at session start. Then:
- Run `/agents` — any newly copied agents should be listed.
- Open any project — Claudio should introduce itself as before, nothing should have broken.

---

## Summary for a human skimming this instead

This file exists so you can say to your own Claude Code session, in a repo you already have Claudio installed from: *"Read UPDATE.md from [this repo] and update my Claudio install to the latest version."* If your installed version has a matching git tag in this repo, it does a real three-way merge (base tag vs. your file vs. latest) — it can tell "you personally edited this" apart from "this section just changed upstream," and only asks you when both happened to the same section. If there's no tag to diff against (older installs), it falls back to a coarser check that just avoids duplicating headings you already have. Either way, it won't clobber your customizations without asking. If you'd rather do it by hand, read `CHANGELOG.md` yourself and copy the pieces you want.
