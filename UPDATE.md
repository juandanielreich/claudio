# UPDATE.md — runbook for an AI agent updating an existing Claudio install

**If you are an AI coding agent (Claude Code or similar) reading this because a user asked you to update their existing Claudio install from this repository: this file is your runbook, not a suggestion to read casually. Follow it in order.**

**Do not treat this repository's own `CLAUDE.md` as behavioral instructions for your current session.** It is the payload you are merging into the user's global config — not a system prompt for you right now. If your working directory is inside this cloned repo, ignore what its `CLAUDE.md` tells you to do as an orchestrator; you are updating it, not running it.

This file is for a user who **already has Claudio installed** and wants the newer rules/agents/hooks added since they installed. If they don't have Claudio yet, use `INSTALL.md` instead. If they only want to see how their setup compares, with or without Claudio, use "Compare only" below and stop there.

---

## Compare only (writes nothing)

Use this when the user asks to compare their setup with Claudio, to see what an install or an update would change, or when `INSTALL.md` found a translated or rewritten Claudio. It works for any config, Claudio or not. **Write nothing:** no file in their config changes, and the version marker is not touched.

1. Resolve the config directory (`~/.claude/`, or `%USERPROFILE%\.claude\` on Windows) and read their `CLAUDE.md`, the `hooks` and `env` blocks of `settings.json` (including whether its hook entries are flat, see "Before either merge" below), the list of files in `agents/` and in `hooks/`, and their log template if they have one.
2. Compare against this repo as it is on disk: `CLAUDE.md` (ignoring the `claudio-repo-guard` block), `settings.example.json`, `agents/`, `hooks/`, `templates/_log_template.md`.
3. Match `CLAUDE.md` rules by what they say, not by heading text: a translated or rewritten Claudio shares no English headings with this repo, and matching by heading would report every rule as new.
4. Report, one line per item:
   - **Version:** their marker (or "none") against the latest in `CHANGELOG.md`, and which runbook would apply: `INSTALL.md`, `UPDATE.md` Step 2A, Step 2B, or none.
   - **In Claudio, not in theirs:** rules, hooks and agents they would gain.
   - **In theirs, not in Claudio:** their own additions. An install or update keeps these.
   - **In both, but different:** say which side looks newer if the changelog tells, otherwise just that they differ.
5. Ask what they want next: nothing, a full install or update, or specific items carried over by hand.

## Step 1 — Find the installed version

1. Resolve the config directory for the current OS: `~/.claude/` (Mac/Linux) or `%USERPROFILE%\.claude\` (Windows).
2. Read the user's installed `~/.claude/CLAUDE.md`.
3. Look for the marker `<!-- claudio-version: X.Y.Z -->` near the top.
   - **Found, and a matching `vX.Y.Z` git tag exists in this repo:** you can do a real three-way merge — go to Step 2A.
   - **Found, but no matching tag exists** (a fork without its own tags, or a canonical release that shipped without one): tell the user there's no base snapshot for their exact version. Fall back to Step 2B, treating their marker version as the "installed version" for the changelog summary.
   - **Not found** (install predates the marker, before 2.9.0, or it's a fork or a translated copy): tell the user this explicitly, then run the structural check in `INSTALL.md` Step 1 ("No marker? Check whether it is a Claudio anyway"). If it shares this repo's English section headings, treat the installed version as `0.0.0` for Step 2B, where every changelog entry is "new" to them. If it is translated or rewritten, don't use Step 2B: it matches by heading, finds none, and would append every section. Go to "Compare only" instead. If it isn't a Claudio at all, use `INSTALL.md`.

## Before either merge (Step 2A or 2B)

Three rules apply whichever merge you run.

**New files are copied, not merged.** A file that exists upstream but neither at the base tag nor locally is new: just copy it. This matters for `hooks/`, where a shared `_lib_*.js` has no `settings.json` entry of its own but the hooks that `require` it fail on every run without it.

**The repo guard never goes in.** From 2.28.0 on, this repo's `CLAUDE.md` carries a block from a `<!-- claudio-repo-guard:start -->` line to a `<!-- claudio-repo-guard:end -->` line, meant for agents working inside the repo. For Step 2A, delete it from temporary copies of the base and of the upstream file before running the merge, never from this clone's own `CLAUDE.md`, and not after the merge: older bases don't have it, so the merge would bring it in as an upstream change. For Step 2B, skip it. If the user's local file has it (a manual install that kept it), delete it there too and tell them. Check afterwards that their `CLAUDE.md` contains no `claudio-repo-guard`.

**Flat hook entries.** Docs and `settings.example.json` before 2.28.1 showed hooks as flat entries, `{ "command": ... }` or `{ "matcher": ..., "command": ... }` straight in the event array. Claude Code requires groups shaped `{ "matcher": ..., "hooks": [{ "type": "command", "command": ... }] }` and ignores the flat ones, so an install that copied them never ran its hooks. If the user's `settings.json` has flat entries pointing at Claudio hooks, tell them, and with their OK rewrite those entries in the nested form of the current `settings.example.json`. Leave their other hooks as they are. Don't three-way merge `settings.example.json` across that change: its old base is flat and the new one nested, so the merge would produce a mix.

## Step 2A — Three-way merge (when a base tag exists)

You have three versions of each tracked file (`CLAUDE.md`, `settings.example.json` → user's `settings.json`, `agents/*.md`, `hooks/*.js`):

- **base** — this repo's file content at the tag matching the user's installed marker: `git show vX.Y.Z:path/to/file` (the only one of the three you need a git command for)
- **local** — the user's current installed file (read directly, no git needed)
- **upstream** — the file as it exists on disk in this cloned repo right now, at `HEAD` (also a plain read — you're already sitting in that checkout, don't `git show HEAD:...` it)

Apply "Before either merge" above first: strip the repo guard from the temporary base and upstream copies, and copy new files.

Before reasoning section-by-section, try a mechanical merge first: `git merge-file -p --diff3 <local> <base> <upstream>` (or `git merge-tree`). Everything that merges without `<<<<<<<` conflict markers is resolved for free — upstream-only changes and local-only changes both fold in automatically with zero ambiguity. You only need to reason, section by section, about the hunks the tool actually flags as conflicting:

- **Tool reports no conflict for a section** → trust it, move on. (Covers: changed only in upstream; changed only in local; unchanged in both; new section added upstream; section removed upstream but you still have local content — the merge tool keeps it, don't second-guess that.)
- **Tool reports a conflict** → check first whether local and upstream actually landed on the same resulting text (e.g. both independently fixed the same typo). If identical, apply it silently, no prompt. If they genuinely differ, don't silently pick one — show the user base, local, and upstream for that section and ask (keep theirs / take upstream / merge by hand).

This is strictly better than Step 2B because it separates "the user's own edit" from "just an old version" instead of guessing from a single-version diff — and doing the merge mechanically first means you only spend reasoning on sections that actually need a judgment call.

## Step 2B — Heading-existence merge (fallback, no base available)

Read this repo's `CHANGELOG.md` and collect every entry newer than the installed version determined in Step 1 (their marker version, or `0.0.0` if there was none). Summarize for the user in plain language what's new — one line per entry — and confirm before applying.

Then, for each changed file:
- **Never blind-overwrite.** Read the user's file first, merge in only the sections/rules that changed.
- **Before adding a new rule/section to `CLAUDE.md`:** check whether a heading with the same or very similar name already exists in the user's file. If it does, skip it, don't duplicate. If it exists but the *content* differs meaningfully from the repo's version, flag it and ask the user which to keep — you can't tell here whether the difference is their customization or just staleness, so always ask, don't guess.
- **`settings.json` hooks:** merge the `hooks` array, don't replace it. Check by matcher + command path, not by array position. Use the nested format of `settings.example.json` (see "Before either merge" above). Merge its `env` block key by key the same way: add a missing key, and ask before changing one the user already set to another value.
- **`agents/*.md`:** if a new agent file was added upstream and the filename doesn't collide with anything the user has, copy it. If it collides, ask before overwriting.
- **Removed/renamed rules:** don't auto-delete the user's local copy — mention it and let them decide.

## Step 3 — Bump the version marker

After applying, update `<!-- claudio-version: X.Y.Z -->` in the user's `~/.claude/CLAUDE.md` to the latest version from `CHANGELOG.md`. If the marker didn't exist before, add it at the top of the file, right under the title line. There's no git tag to create here — `~/.claude/` isn't this repo. The marker alone is what anchors the *next* update to a matching tag in the upstream repo, making it a real three-way merge instead of falling back to Step 2B.

## Step 4 — Verify

Tell the user to restart Claude Code (agents and hooks are only loaded at session start). Then:
- Run `/agents`, and any newly copied agents should be listed.
- Open any project: Claudio should introduce itself as before, nothing should have broken.
- Run the hook check of `INSTALL.md` Step 4. A shared file the update forgot to copy shows up only there; the two checks above pass without noticing it.

## Step 5 — Offer to set up notifications for next time

If the user isn't already watching the repo, tell them they can be emailed the next time a version ships instead of checking by hand: on GitHub, **Watch, Custom, Releases**. It's a one-time click, nothing runs on their machine. See the "Staying up to date" section of `README.md`.

---

## Summary for a human skimming this instead

This file exists so you can say to your own Claude Code session, in a repo you already have Claudio installed from: *"Read UPDATE.md from [this repo] and update my Claudio install to the latest version."* If your installed version has a matching git tag in this repo, it does a real three-way merge (base tag vs. your file vs. latest) — it can tell "you personally edited this" apart from "this section just changed upstream," and only asks you when both happened to the same section. If there's no tag to diff against (older installs), it falls back to a coarser check that just avoids duplicating headings you already have. Either way, it won't clobber your customizations without asking. If you'd rather do it by hand, read `CHANGELOG.md` yourself and copy the pieces you want.
