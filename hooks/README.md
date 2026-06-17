# Hooks

Claudio uses three hooks to enforce behavior at the right moments. Hooks are Node.js scripts wired into Claude Code's event system via `settings.json`.

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
    ]
  }
}
```

Use absolute paths. On Windows, use forward slashes or escape backslashes. See `settings.example.json` for a template.

## How state persists between sessions

The session state file lives in the OS temp directory (`os.tmpdir()`), keyed by an MD5 hash of the project path. It persists between CC sessions until explicitly cleared. This enables the "sprint + review" flow: work for multiple sessions, then review everything at once.

The `## PENDING IMPACT ANALYSIS` section in `_claude_log.md` also persists between sessions — it's only deleted after the Impact Analyst runs.
