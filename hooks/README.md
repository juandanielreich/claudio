# Hooks

Claudio registers the hooks listed in `settings.example.json` (`check_escritura.js` runs `check_hardcoded_paths.js` and `check_no_emdash.js` inside it) to enforce behavior at the right moments. Hooks are Node.js scripts wired into Claude Code's event system via `settings.json`.

## The hooks

### `check_log.js` — UserPromptSubmit

Runs on every message the user sends. It does the following:

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

A write under `.claude/agent-memory/` (the memory a subagent such as QA keeps for itself) doesn't count as an edit: it isn't the session's own work, and with QA running per piece it would inflate the list the close offers for review. It does reset the "committed" flag, because that memory has to be committed like the code, and `check_log.js` warns about it even when no edit was counted.

### `check_hardcoded_paths.js` — PreToolUse (matcher: `Write|Edit`)

Registered through `check_escritura.js`, the dispatcher that also runs `check_no_emdash.js` in the same process; `settings.json` points at the dispatcher, not at this file.

Runs before every `Write` or `Edit`. Scans the content being written for hardcoded absolute paths that depend on a username or machine (`C:\Users\<name>\...`, `/home/<name>/...`, `/Users/<name>/...`) in code/script/config files (`.js .jsx .ts .tsx .ps1 .sh .py .json .env .yaml .yml .cjs .mjs .bat .cmd`). If it finds one, it blocks the write with `decision: "block"` and a reason explaining what to use instead (`$env:USERPROFILE`, `os.homedir()`, etc.).

Skips `node_modules`, `.git`, `dist`, `build`, `.next`, and comment lines (`// # *`) — the latter to avoid blocking example paths in inline docs, at the cost of not catching a real path hidden inside a comment. Exits silently when there's no violation, so it costs nothing on the normal path. Does not check `.md` files — see the "General rule — paths are always generic and portable" section in `CLAUDE.md`.

The folder exemption looks at the normalized path, so `proj/node_modules/../x.js` is checked like any file outside `node_modules`, and `.env` files are recognized in any case (`.ENV` too). The session scratchpad Claude Code assigns (`<temp>/claude/<project>/<session>/scratchpad/`) is also exempt: it never moves between machines and is never versioned. Only that folder, and only inside the OS temp directory; the rest of the temp directory is still checked.

When it blocks, the model gets the full reason in `permissionDecisionReason`, the only field it reads on a deny; there is no short version. `scripts/probar_deny_motivo.js` checks this for every blocking hook.

### `check_cwd_sesion.js` (PreToolUse, matcher: `Bash|PowerShell|Agent`)

The Bash and PowerShell tools keep their working directory between calls, so a `cd agents` inside one command leaves the session in that subfolder. A relative `node scripts/...` then breaks, and a subagent launched from there writes its memory to `agents/.claude/agent-memory/`. This hook reads the real `cwd` from the payload and, if it's a subfolder of `CLAUDE_PROJECT_DIR`, blocks the call with the exact command to go back. A command that starts by going back to the root passes, and so do the worktrees Claude Code creates under `.claude/worktrees/` and any folder outside the project.

`CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` in the `env` block of `settings.example.json` fixes the cause for the main thread. Claude Code's docs limit it to the main thread, so this hook stays as the backstop for subagents. Suite: `scripts/probar_cwd_sesion.js`.

### `check_kill_por_nombre.js` (PreToolUse, matcher: `Bash|PowerShell`)

Blocks killing processes by name: `taskkill /IM` and `/FI`, `Stop-Process -Name` (with any prefix PowerShell accepts, `-N`, `-Nam`), `pkill`, `killall`, `wmic ... delete`, and looking a process up by name and killing what comes out in the same statement (`Get-Process chrome | Stop-Process`, `ps aux | grep x | xargs kill`). A kill by name also closes the user's own browser or dev server with the same name. Killing by PID passes, and the message says how to get a PID from a port. Text that only names the forms (a `grep`, an `echo`, a commit message) passes. Hooks run for subagents' tool calls too, so this covers every agent. Suite: `scripts/probar_kill_por_nombre.js`.

### `check_revertir_subagente.js` (PreToolUse, matcher: `Bash|PowerShell`)

Blocks a **subagent** from reverting files with git: `checkout` and `switch` (whole), `restore` (except `--staged` alone), `stash` (except `list` and `show`), `reset --hard`/`--merge`/`--keep`, `clean -f`, `apply -R`. With several sessions in the same folder, `git status` also shows someone else's work in progress, and a half-written file looks like a leftover. A subagent is recognized by the `agent_id` field Claude Code adds to the payload of a subagent's tool call. The main thread is not blocked, and neither is a subagent inside its own worktree (`.claude/worktrees/`), unless the command points out of it with `-C`, `--work-tree` or a `cd`. Suite: `scripts/probar_revertir_subagente.js`.

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

### `_lib_text.js` (shared, not a hook)

Decides what counts as code, and so is exempt: backtick and tilde fences (also indented inside a list item), indented code blocks, and inline spans. `check_style.js`, `check_decision_prose.js` and `check_no_emdash.js` all require it, so it must sit in the same folder as them. An unclosed fence exempts nothing.

### `_lib_stdin.js`, `_lib_hook_salida.js`, `_lib_comandos.js` (shared, not hooks)

Required by the three hooks that block Bash, PowerShell and Agent, so they must sit in the same folder. `_lib_stdin.js` reads the payload. `_lib_hook_salida.js` writes the deny object, with the full reason in `permissionDecisionReason`. `_lib_comandos.js` splits a command into statements, simple commands and words, respecting quotes, so a `grep "git restore"` isn't read as a `git restore`. `check_escritura.js` doesn't use them on purpose: it writes its own output, so a missing shared file can't take both write checks down.

### `clear_session_state.js` — manual

Not a hook — a script you run at session close after the batched proposal:

```bash
node ~/.claude/hooks/clear_session_state.js
```

Deletes the `claude_session_<hash>.json` for the current directory. If the user says "Later" to the batched proposal, don't run this — state persists to the next session.

## Wiring up

Copy the `hooks` block of [`settings.example.json`](../settings.example.json) into `~/.claude/settings.json`, and the keys of its `env` block into yours; it is the one full definition. Use absolute paths. On Windows, use forward slashes or escape backslashes. Step 3 of [`docs/setup.md`](../docs/setup.md) has the details.

## How state persists between sessions

The session state file lives in the OS temp directory (`os.tmpdir()`), keyed by an MD5 hash of the project path. It persists between CC sessions until explicitly cleared. This enables the "sprint + review" flow: work for multiple sessions, then review everything at once.

The `## PENDING IMPACT ANALYSIS` section in `_claude_log.md` also persists between sessions — it's only deleted after the Impact Analyst runs.
