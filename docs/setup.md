# Setup guide

This guide assumes a clean `~/.claude/` with no existing config. If you already have your own `CLAUDE.md`, `settings.json`, or agents and want an AI agent to merge Claudio in safely instead of following these steps by hand, use [`INSTALL.md`](../INSTALL.md) instead.

## Prerequisites

- Claude Code CLI installed and working (`claude --version`)
- Node.js available in your terminal (for the hooks)

## Step 1 — Copy the files

Clone this repo or copy its contents into your Claude Code config directory:

| OS | Config directory |
|---|---|
| Mac / Linux | `~/.claude/` |
| Windows | `%USERPROFILE%\.claude\` |

The files that must be in the config root:
- `CLAUDE.md` — the orchestrator definition (loaded automatically by CC)
- `project-strategy.md` — reference stack (read by the Architect agent)
- `templates/_log_template.md` — template for new project logs

**Keep the version marker.** `CLAUDE.md` starts with a `<!-- claudio-version: X.Y.Z -->` comment on its own line — don't strip it when you copy the file in. It's what lets `UPDATE.md` find a matching git tag later and do a real diff against what you have, instead of guessing. If you hand-merge Claudio's `CLAUDE.md` into an existing one instead of replacing it outright, carry the marker line over manually.

## Step 2 — Make agents available

Claude Code loads agents from `~/.claude/agents/`. You have two options:

**Option A — Copy the agents folder:**
```bash
cp -r agents/ ~/.claude/agents/
```

**Option B — Symlink (recommended if you want to keep one copy):**
```bash
# Mac/Linux
ln -s /path/to/claudio-public/agents ~/.claude/agents

# Windows (PowerShell, run as admin or with Developer Mode enabled)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\agents" -Target "C:\path\to\claudio-public\agents"
```

After placing the agents, **restart Claude Code** — agents are loaded at session start.

## Step 3 — Wire up the hooks

Edit (or create) `~/.claude/settings.json` and add the `hooks` block:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "command": "node /absolute/path/to/hooks/check_log.js" }
    ],
    "PostToolUse": [
      { "command": "node /absolute/path/to/hooks/detect_significant_event.js" }
    ],
    "PreToolUse": [
      { "matcher": "Write|Edit", "command": "node /absolute/path/to/hooks/check_hardcoded_paths.js" }
    ]
  }
}
```

Replace `/absolute/path/to/hooks/` with the actual path to the `hooks/` folder. Use absolute paths — relative paths don't work in hooks.

See `settings.example.json` for the full template.

## Step 4 — Open a project

Start Claude Code in any project directory:

```bash
cd my-project
claude
```

Claudio introduces itself:
> "I'm Claudio. [Detected project: my-project]. No previous session found."

On the first message, if `_claude_log.md` doesn't exist, the hook reminds Claudio to create it. Claudio will create it using `templates/_log_template.md`.

## Verify it's working

Type any message in your project. You should see:
- Claudio introduce itself and check the log
- If you type "this is critical", a reminder about the Impact Analyst should appear

To verify agents are loaded, type `/agents` in CC — the 6 agents should appear in the list.

## Updating later

Once installed, don't repeat these steps by hand to pick up new rules — tell your Claude Code session *"Read UPDATE.md from this repo and update my Claudio install."* It reads your version marker, finds the matching `vX.Y.Z` git tag in this repo, and merges in only what changed upstream since then (without touching sections you customized yourself). This only works because every release of this repo is tagged — if you're maintaining your own fork, tag each release (`git tag vX.Y.Z`) or `UPDATE.md` will fall back to a coarser merge that can't tell your edits apart from stale content. See [`UPDATE.md`](../UPDATE.md).

## Troubleshooting

**Agents not showing up:** Confirm `~/.claude/agents/` exists and contains `.md` files with valid YAML frontmatter (`name:` field). Restart CC.

**Hooks not running:** Check that the paths in `settings.json` are absolute and point to existing files. Run `node /path/to/hooks/check_log.js` manually to see if it errors.

**Hook errors in CC:** CC shows hook errors in the conversation. Common cause: Node.js not in PATH when CC starts. Try launching CC from a terminal that has Node available.

**`_claude_log.md` not being created:** The hook only *reminds* Claudio to create the log — Claudio creates it. If you see the reminder but no log, check that `templates/_log_template.md` exists in the config root.
