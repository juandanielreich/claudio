# Hooks

Claudio uses four hooks to enforce behavior at the right moments. Hooks are Node.js scripts wired into Claude Code's event system via `settings.json`.

## The hooks

### `check_log.js` — UserPromptSubmit

Runs on every message the user sends. Does four things:

1. **Log check**: if `_claude_log.md` doesn't exist in the current directory, injects a reminder to create it before responding. This enforces the "read the log first" rule.

2. **Urgency detection**: scans the user's prompt for urgency keywords ("critical", "urgent", "must not fail", "crucial"). If found, injects: *"Call the Impact Analyst before implementing any change."*

3. **Pending section reminders**: reads `_claude_log.md` for `## PENDING IMPACT ANALYSIS` and `## PENDING DESIGN` sections. If they exist, reminds that items are waiting.

4. **Session state summary**: if the session has accumulated edits (tracked by `detect_significant_event.js`), shows a one-line summary and the close procedure.

5. **PRODUCT.md check**: if `PRODUCT.md` doesn't exist in the project, reminds once per session to create it.

### `detect_significant_event.js` — PostToolUse

Runs after every tool call. Silently accumulates what happened in `claude_session_<hash>.json` in the temp directory:
- Every `Write` or `Edit` call increments the edit counter and records the filename
- UI files (`.jsx`, `.tsx`, `.html`, `.css`, `.vue`, `.svelte`) are tracked separately
- `wrangler pages deploy` or similar → marks deploy as run
- `npm run build` or similar → marks build as run
- `git commit` or `git push` → marks git as committed

This state powers the session-close batched proposal that `check_log.js` surfaces.

### `check_hardcoded_paths.js` — PreToolUse (matcher: `Write|Edit`)

Runs before every `Write` or `Edit`. Scans the content being written for hardcoded absolute paths that depend on a username or machine (`C:\Users\<name>\...`, `/home/<name>/...`, `/Users/<name>/...`) in code/script/config files (`.js .jsx .ts .tsx .ps1 .sh .py .json .env .yaml .yml .cjs .mjs .bat .cmd`). If it finds one, it blocks the write with `decision: "block"` and a reason explaining what to use instead (`$env:USERPROFILE`, `os.homedir()`, etc.).

Skips `node_modules`, `.git`, `dist`, `build`, `.next`, and comment lines (`// # *`) — the latter to avoid blocking example paths in inline docs, at the cost of not catching a real path hidden inside a comment. Exits silently when there's no violation, so it costs nothing on the normal path. Does not check `.md` files — see the "General rule — paths are always generic and portable" section in `CLAUDE.md`.

### `clear_session_state.js` — manual

Not a hook — a script you run at session close after the batched proposal:

```bash
node ~/.claude/hooks/clear_session_state.js
```

Deletes the `claude_session_<hash>.json` for the current directory. If the user says "Later" to the batched proposal, don't run this — state persists to the next session.

## Wiring up

Add to `~/.claude/settings.json`:

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

Use absolute paths. On Windows, use forward slashes or escape backslashes. See `settings.example.json` for a template.

## How state persists between sessions

The session state file lives in the OS temp directory (`os.tmpdir()`), keyed by an MD5 hash of the project path. It persists between CC sessions until explicitly cleared. This enables the "sprint + review" flow: work for multiple sessions, then review everything at once.

The `## PENDING IMPACT ANALYSIS` section in `_claude_log.md` also persists between sessions — it's only deleted after the Impact Analyst runs.
