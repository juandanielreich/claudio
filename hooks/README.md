# Hooks

Claudio uses five hooks to enforce behavior at the right moments. Hooks are Node.js scripts wired into Claude Code's event system via `settings.json`.

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

### `check_decision_prose.js` — Stop

Runs when Claude finishes a turn. Blocks the turn from closing if the response hands the user a decision in prose without calling `AskUserQuestion` — the rule in `CLAUDE.md` that prose buries the choice under the argument.

Why this one can be mechanical when a "response length" hook can't: the right length depends on the content, but `AskUserQuestion` is a **tool call in the transcript** — a real artifact, not a self-report. Asking for evidence in the output is the strong mechanism; asking the model to confirm it behaved never works.

Detection is deliberately literal, and exits on `!text.includes('?')` before any structural regex runs — no question, no decision, no cost on the normal path. Three patterns:
- `[A]` / `[B]` — lettered option markers (2 or more)
- `Option 1` / `Option 2` — numbered options (2 or more)
- A sentence ending in `?` that contains ` or ` — the common prose shape

**Numbered lists (`1.` / `2.`) are excluded on purpose.** They collide with summaries and next-step lists that happen to end in a question, which would make the hook fire constantly on correct responses. A hook that cries wolf gets disabled; keeping the pattern list short and literal is what keeps it trustworthy — the same tradeoff `check_hardcoded_paths.js` makes by skipping comment lines.

The walk covers the current turn only: from the end of the transcript back to the last real user message (`tool_result` entries carry `role: 'user'` but don't end a turn). An `AskUserQuestion` from a previous turn doesn't excuse the current one.

If it produces false positives in your writing, narrow the patterns rather than removing the hook — the `X or Y?` pattern is the exposed one (an informational question with "or" inside is not a decision).

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
    ],
    "Stop": [
      { "command": "node /absolute/path/to/hooks/check_decision_prose.js" }
    ]
  }
}
```

Use absolute paths. On Windows, use forward slashes or escape backslashes. See `settings.example.json` for a template.

## How state persists between sessions

The session state file lives in the OS temp directory (`os.tmpdir()`), keyed by an MD5 hash of the project path. It persists between CC sessions until explicitly cleared. This enables the "sprint + review" flow: work for multiple sessions, then review everything at once.

The `## PENDING IMPACT ANALYSIS` section in `_claude_log.md` also persists between sessions — it's only deleted after the Impact Analyst runs.
