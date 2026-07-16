# How Claudio works

## The three layers

Claudio is built on three things Claude Code provides natively:

1. **CLAUDE.md** — a Markdown file loaded into every session as system context. This is where the orchestrator lives.
2. **Native subagents** — `.md` files with YAML frontmatter in `~/.claude/agents/`. CC can spawn them with specific models, tools, and memory scopes.
3. **Hooks** — shell commands that run on CC events (UserPromptSubmit, PostToolUse, etc.).

No custom servers, no databases, no build steps. It's configuration files all the way down.

## The orchestrator (CLAUDE.md)

`CLAUDE.md` contains the rules Claudio follows:

- **Session start**: read `_claude_log.md`, introduce itself with a one-line summary
- **During work**: detect urgency keywords, update the log on decisions, track if files changed
- **Session close**: present the batched agent proposal, update the log, clear state

The key insight: everything that would be "in the model's head" is instead written down. The log is the memory. The agents are the specialization. The hooks are the enforcement.

## Project memory (`_claude_log.md`)

Each project has one log file. It has a fixed structure (see `templates/_log_template.md`):

- **LAST SESSION** — exactly where to resume: what was worked on, what's done, the immediate next step, warnings
- **CURRENT STATE** — what works, what's broken, deploy URL and version
- **PENDING** — blockers, high priority, optional improvements
- **DECISIONS MADE** — only decisions that pass the 3-test filter (hard to reverse, surprising without context, a genuine trade-off), logged in a compact one-line format, not a full table
- **KNOWN ISSUES** — one entry per recurring problem (occurrences, symptom, root cause, mitigation, status), updated in place rather than duplicated
- **CHANGE HISTORY** — chronological entries

Claudio reads this at session start, writes to it during the session when decisions happen, and updates it fully at session close. The hook (`check_log.js`) enforces that it exists before Claudio responds to anything.

## Agents as native CC subagents

Each agent is a `.md` file with this structure:

```yaml
---
name: qa
description: Verifies critical user paths after editing code...
model: sonnet
memory: project
tools: Read, Grep, Glob, Bash, Write, Edit
---

# QA
[agent body — this is its system prompt]
```

Claude Code reads the frontmatter to know:
- `name`: how Claudio invokes it (`subagent_type: "qa"`)
- `description`: when to auto-dispatch it (Claudio's descriptions say "do NOT auto-invoke")
- `model`: which model to use for this agent (haiku for procedural, sonnet for analytical, opus for strategic)
- `memory: project`: creates `.claude/agent-memory/<agent>/` in the project repo, injected at startup

Agents must live in `~/.claude/agents/` to be visible. The body of the `.md` becomes their system prompt.

## Hooks as real enforcement

CC hooks run shell commands at specific events:

| Event | Hook | What it does |
|---|---|---|
| UserPromptSubmit | `check_log.js` | Checks log, detects urgency, reminds of pending items, summarizes session state |
| PostToolUse | `detect_significant_event.js` | Accumulates what changed (files, builds, deploys, git) |
| PreToolUse (`Write\|Edit`) | `check_hardcoded_paths.js` | Blocks the write if it hardcodes an absolute, machine-dependent path |

The hooks communicate with CC by writing JSON to stdout. `UserPromptSubmit` and `PostToolUse` inject context:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "message injected into the conversation"
  }
}
```

`PreToolUse` can instead block the action outright:
```json
{
  "decision": "block",
  "reason": "explanation shown to Claudio and the user"
}
```

This is how urgency detection works: the hook detects "critical" in the prompt and injects a reminder into the conversation that Claudio sees and acts on. `check_hardcoded_paths.js` uses the block form instead — the write never happens.

## The session state file

`detect_significant_event.js` writes to `claude_session_<hash>.json` in the OS temp directory. The hash is derived from the project path, so each project has its own state file.

The state accumulates:
- `editCount`: total files edited
- `filesEdited`: list of edited filenames
- `uiFilesEdited`: subset of UI files
- `buildRan`: boolean
- `deployRan`: boolean
- `gitCommitted`: boolean
- `productMdMentioned`: boolean (to avoid repeating the PRODUCT.md reminder)

This state persists between CC sessions. It's only cleared when you run `clear_session_state.js` after the batched proposal.

## The batched proposal at session close

At the end of a session, Claudio presents:

```
Closing session — [project]

Signals:
  • 4 edits in: Dashboard.jsx, api.js, auth.js +1 more
  • UI files: Dashboard.jsx
  • Build/deploy: no
  • Analyst pending: none
  • PRODUCT.md: up to date
  • Learnings: none
```

Then the choice itself arrives as an `AskUserQuestion` — pick any combination of QA, UX Designer, Analyst and Simplify, or "Later". The exact option list lives in `CLAUDE.md` → "Session close procedure"; this page won't restate it, because three copies of that menu once drifted out of sync with the real one for months.

The signals come from the session state file. Claudio offers every agent without judgment — no "this doesn't apply". The user decides.

## PRODUCT.md as project anchor

Every project should have `PRODUCT.md` in its root. It describes what the product *is* (not how it was built), with:
- What it is and who uses it
- Main flows (format: "When X → Y happens")
- Current technical decisions
- Out of scope

QA's Full Mode (on-demand) verifies the entire project against PRODUCT.md. Without it, QA can only verify what changed in the session.

The Architect creates PRODUCT.md in new projects (New project mode). For existing projects without it, the Architect can generate it by reverse-engineering the code (Existing project documentation mode).
