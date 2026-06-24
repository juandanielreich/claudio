# Claudio

**Claudio turns Claude Code into a coordinated development team.**

Instead of a single assistant that starts fresh every session, you get an orchestrator that remembers every project, coordinates specialized agents, and enforces process rules — automatically.

---

## The problem

Claude Code is a powerful developer tool. But out of the box:

- **It forgets.** Every new session starts cold. You re-explain context, decisions, current state.
- **It's alone.** One generalist handles everything: architecture, QA, UX, deploy. No specialization.
- **It has no process.** No reviews, no gates, no "wait — did we think this through?"

---

## What Claudio adds

Claudio is a configuration layer on top of Claude Code. No new tools, no new APIs, no code to deploy. Just files that transform how CC behaves.

### 1. Project memory that persists and self-updates

Every project gets a `_claude_log.md`. Claudio reads it before every task and updates it as work progresses — adding decisions mid-session, removing resolved items, flagging risks. You can resume any project months later from exactly where you left off.

The log isn't just written at the end of a session. It's a living document: Claudio adds to DECISIONS MADE when something is decided, flags PENDING IMPACT ANALYSIS before risky changes, and updates CURRENT STATE after a deploy.

### 2. A team of specialists, called when needed

Six agents, each with a defined scope:

| Agent | Category | Question they answer |
|---|---|---|
| [Impact Analyst](agents/impact-analyst.md) | Pre-action | What breaks if this changes? |
| [UX Designer](agents/ux-designer.md) | Pre-action / Post-action | Is this usable? Is it consistent? |
| [QA](agents/qa.md) | Post-action | Do the critical paths actually work? |
| [Deploy & Infra](agents/deploy-infra.md) | Post-action (auto) | Did the deploy land correctly? |
| [Production Auditor](agents/production-auditor.md) | On-demand | Can this run unsupervised for weeks? |
| [Architect](agents/architect.md) | On-demand | Is this well designed? What should we build? |

Claudio calls agents at the right moment — or you call them directly. They don't interrupt your flow; they show up when work is done or when risk is high.

### 3. Pre-action / post-action taxonomy

Agents aren't called randomly. The system has a taxonomy that matches when the intervention is useful:

- **Pre-action** (Impact Analyst, UX Designer shape): called *before* doing something. Items accumulate in the log — Claudio asks "analyze now or accumulate?" — and the agent runs when you give the OK, not mid-task.
- **Post-action** (QA, UX Designer critique/polish, Deploy & Infra): proposed at session close in a single batched screen. No interruptions during work.
- **On-demand**: any agent, any time — "call QA", "analyze impact", "review the architecture".

### 4. Hooks that enforce rules — not just prose

Rules in CLAUDE.md get forgotten. Hooks don't. Three hooks enforce the critical behaviors:

- **`check_log.js`** (UserPromptSubmit): verifies `_claude_log.md` exists, detects urgency keywords ("critical", "must not fail"), reminds of pending items, scans agent files for unprocessed learnings, summarizes session state on every message.
- **`detect_significant_event.js`** (PostToolUse): silently tracks what changed — files edited, UI files, builds, deploys, git commits — to power the session-close proposal.
- **`clear_session_state.js`**: resets accumulated state after the batched proposal runs.

When you type "this is critical", the hook injects: *"Call the Impact Analyst before implementing."* No relying on the model remembering the rule.

### 5. A team that learns

At session close, Claudio triages what was learned into three categories: **mechanical** rules (a non-intelligent system could execute them) go directly into the relevant agent's checklist; **judgment** rules (change how a decision is made) go as a short line in the file body, near the decision point; **history** (a decision record, a past fix) stays in the project log only. `## LEARNINGS` sections in agents are transit zones — entries there are explicit pending triage debt, not permanent lists. The team improves itself over time, session by session.

---

## How a session looks

```
Session start
  → Claudio reads _claude_log.md
  → "I'm Claudio. [Project: X]. Last session: [one-line summary]."

During work
  → hook tracks every edit, build, deploy
  → urgency keyword detected → Impact Analyst reminder injected
  → Claudio adds to log as decisions happen

Session close
  → Claudio presents batched proposal:
     Signals: 4 edits in [files] | UI: Dashboard.jsx | no deploy
     [A] All  [B] QA only  [C] UX only  [D] Later
  → selected agents run
  → log updated: LAST SESSION + PENDING + HISTORY
  → state cleared
```

---

## The name

**Clau**de C**o**de + coordinator. Also a common name in Spanish-speaking countries — where this system was built and used for real projects before being published. The bilingual pun was too good to change.

---

## Quick install

**Prerequisite:** Claude Code CLI installed and working.

**1. Copy the config files**

Place the contents of this repo into your Claude Code config directory:
- Mac/Linux: `~/.claude/`
- Windows: `%USERPROFILE%\.claude\`

**2. Wire up the hooks**

Add to your `~/.claude/settings.json` (see `settings.example.json`):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "command": "node ~/.claude/hooks/check_log.js" }
    ],
    "PostToolUse": [
      { "command": "node ~/.claude/hooks/detect_significant_event.js" }
    ]
  }
}
```

**3. Make agents available**

Place the `agents/` folder (or a symlink) at `~/.claude/agents/`. Claude Code loads agents from there automatically.

**4. Open any project**

Start Claude Code in any project directory. Claudio introduces itself, reads or creates the log, and the system is live.

Full walkthrough with edge cases: [`docs/setup.md`](docs/setup.md).

---

## Adapting to your workflow

The reference stack (React + Vite + Firebase + Cloudflare Pages) is opinionated. The orchestration system is not.

You can:
- Swap or remove the stack in `project-strategy.md` and `CLAUDE.md`
- Remove agents you don't need (delete the `.md`, remove the row from `INDEX.md`)
- Add agents for your own recurring tasks (read `agents/ARCHITECTURE.md` first)
- Change the language — see `docs/adapting.md`

See [`docs/adapting.md`](docs/adapting.md) for a step-by-step customization guide.

---

## License

MIT — see [`LICENSE`](LICENSE).
