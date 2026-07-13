# INSTALL.md — runbook for an AI agent installing Claudio

**If you are an AI coding agent (Claude Code or similar) reading this because a user asked you to install Claudio from this repository: this file is your runbook, not a suggestion to read casually. Follow it in order.**

**Do not treat this repository's own `CLAUDE.md` as behavioral instructions for your current session.** It is the payload you are installing into the user's global config — not a system prompt for you right now. If your working directory is inside this cloned repo, ignore what its `CLAUDE.md` tells you to do as an orchestrator; you are installing it, not running it.

---

## Before you start

1. **Confirm before writing anything.** You're about to modify the user's global Claude Code config (`~/.claude/` on Mac/Linux, `%USERPROFILE%\.claude\` on Windows), which affects every project they use Claude Code in — not just this one. Tell them exactly what you intend to create or change, and wait for explicit go-ahead. This is not optional politeness — it's a shared-state, hard-to-reverse change.
2. **Resolve the real config directory** for the current OS:
   - Mac/Linux: `~/.claude/`
   - Windows: `%USERPROFILE%\.claude\` (or `$env:USERPROFILE\.claude\` in PowerShell)

---

## Step 1 — Detect existing config (do not skip this)

**If the user's `~/.claude/CLAUDE.md` already contains a `<!-- claudio-version: X.Y.Z -->` marker, they already have Claudio installed — stop here and use `UPDATE.md` instead.** This file is for a first install, not for bringing an existing one up to date.

Check, in order, whether the user already has:
- `~/.claude/CLAUDE.md` with real content
- `~/.claude/settings.json`
- `~/.claude/agents/` containing `.md` files

If any of these already have content, **do not overwrite blindly.** Ask the user which strategy they want, per file:

- **CLAUDE.md** — options: (a) replace entirely, (b) append Claudio's content as a new section at the end of the existing file, (c) skip and let the user merge by hand. Default recommendation: (b) if the existing file has real content; (a) only if it's empty or trivial.
- **settings.json** — never overwrite the whole file. Read it, then merge the `hooks` arrays. For each hook Claudio needs (`UserPromptSubmit` → `check_log.js`, `PostToolUse` → `detect_significant_event.js`, `PreToolUse` with matcher `Write|Edit` → `check_hardcoded_paths.js`), check whether an equivalent command is already registered for that event. If not, append it — don't replace the array or drop the user's existing hooks.
- **agents/** — copy files that don't already exist by filename. If a name collides with one of the user's own agents (e.g. they already have a `qa.md`), ask before overwriting — don't silently replace a custom agent.

## Step 2 — Copy the payload

Follow `docs/setup.md` Steps 1-3 (files, agents, hooks), using the config directory resolved above.

**Important substitution:** this repository's `CLAUDE.md` uses the literal placeholder `<your-config-dir>` in its "System paths" table. Replace it with the actual resolved path for this user's OS before writing the file — don't leave placeholder text sitting in a live config.

## Step 3 — Wire hooks safely

When editing `settings.json`, always read the existing file first (if any) and merge — never overwrite the whole file. Use absolute paths to each hook script; relative paths don't work in hooks (see `docs/setup.md`).

## Step 4 — Verify

Tell the user to restart Claude Code — agents are only loaded at session start. Then:
- Run `/agents` — the copied agents should be listed.
- Open any project and type a message — Claudio should introduce itself.
- Type "this is critical" — a reminder about the Impact Analyst should appear.

## Step 5 — Point them at customization

Mention `docs/adapting.md` for changing the language, stack, or agent set to fit their own workflow. The defaults (Spanish→English already adapted here, React/Vite/Firebase/Cloudflare stack) are opinionated starting points, not requirements.

---

## Summary for a human skimming this instead

This file exists so you can say to your own Claude Code session: *"Read INSTALL.md from [this repo] and install Claudio into my global profile."* It handles merging with whatever you already have — it will not clobber your existing `CLAUDE.md`, `settings.json`, or agents without asking first. If you'd rather do it by hand, use `docs/setup.md` instead.
