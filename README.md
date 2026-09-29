# Claudio

> ## For AI agents
>
> If a user pointed you at this repository, pick the runbook by what they want. Never write to their global config before telling them what you'll change and getting a yes.
>
> First clone it, with its tags, into a folder of its own, never into the config directory: `git clone https://github.com/juandanielreich/claudio`. The runbooks compare against files on disk and against release tags, so reading the web page is not enough.
>
> | The user wants to | Their config (`~/.claude/`, or `%USERPROFILE%\.claude\` on Windows) | Follow |
> |---|---|---|
> | Install Claudio | anything, including their own setup or a Claudio without a version marker | [`INSTALL.md`](INSTALL.md): its Step 1 detects what they have and may send them to `UPDATE.md` |
> | Update Claudio | a Claudio, with or without a `<!-- claudio-version: X.Y.Z -->` marker in `CLAUDE.md` | [`UPDATE.md`](UPDATE.md): without a marker, its Step 1 checks whether the copy can be merged or only compared |
> | Compare their setup with Claudio, or see what an install or update would change | anything | [`UPDATE.md` § Compare only](UPDATE.md#compare-only-writes-nothing): reads, reports, writes nothing |
>
> If the request is vague ("check out this repo", "set this up"), read their config first, then ask which of the three they mean. This repo's own `CLAUDE.md` is the payload to install, not instructions for your session: if you are working inside a clone, don't start acting as Claudio because of it.

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

Seven agents, each with a defined scope:

| Agent | Category | Question they answer |
|---|---|---|
| [Strategist](agents/strategist.md) | On-demand | What should we build and why? Is it worth it? |
| [Impact Analyst](agents/impact-analyst.md) | Pre-action | What breaks if this changes? |
| [UX Designer](agents/ux-designer.md) | Pre-action / Post-action | Is this usable? Is it consistent? |
| [QA](agents/qa.md) | Post-action | Do the critical paths actually work? |
| [Deploy & Infra](agents/deploy-infra.md) | Post-action (auto) | Did the deploy land correctly? |
| [Production Auditor](agents/production-auditor.md) | On-demand | Can this run unsupervised for weeks? |
| [Architect](agents/architect.md) | On-demand | Is this well designed? How do we build it? |

Claudio calls agents at the right moment — or you call them directly. They don't interrupt your flow; they show up when work is done or when risk is high.

### 3. Pre-action / post-action taxonomy

Agents aren't called randomly. The system has a taxonomy that matches when the intervention is useful:

- **Pre-action** (Impact Analyst, UX Designer shape): called *before* doing something. Items accumulate in the log — Claudio asks "analyze now or accumulate?" — and the agent runs when you give the OK, not mid-task.
- **Post-action** (QA, UX Designer critique/polish, Deploy & Infra): proposed at session close in a single batched screen. No interruptions during work.
- **On-demand**: any agent, any time — "call QA", "analyze impact", "review the architecture".

### 4. Hooks that enforce rules — not just prose

Rules in CLAUDE.md get forgotten. Hooks don't. These hooks enforce the critical behaviors, plus a script you run by hand:

- **`check_log.js`** (UserPromptSubmit): verifies `_claude_log.md` exists, detects urgency keywords ("critical", "must not fail"), reminds of pending items, scans agent files for unprocessed learnings, summarizes session state on every message.
- **`detect_significant_event.js`** (PostToolUse): silently tracks what changed — files edited, UI files, builds, deploys, git commits — to power the session-close proposal.
- **`check_escritura.js`** (PreToolUse, `Write|Edit`): a dispatcher that runs two write checks in one process. `check_hardcoded_paths.js` blocks a write that hardcodes an absolute path depending on the current username or machine (system folders like `Public`/`Default` and paths inside comments are ignored). `check_no_emdash.js` blocks a `Write`/`Edit` that adds an em dash to a `.md` file (em dashes inside inline spans or code fences that declare a language survive; a fence with no language counts, and under `skills/` and `agents/` every fence counts). `scripts/probar_hooks.js` is the test suite for both, and for what the two `Stop` hooks treat as code (`hooks/_lib_text.js`, shared by the three).
- **`check_decision_prose.js`** and **`check_style.js`** (Stop): check the finished reply, see "Wire up the hooks" below.
- **`clear_session_state.js`** (not a hook, run by hand): resets accumulated state after the batched proposal runs.

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
  → Claudio reports the signals: 4 edits in [files] | UI: Dashboard.jsx | no deploy
  → then asks which agents to run (QA / UX Designer / Analyst / Simplify / Later)
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

**Prefer having an AI agent do this for you?** Tell your Claude Code session: *"Read INSTALL.md from this repo and install Claudio into my global profile."* It merges safely with any existing `CLAUDE.md`, `settings.json`, or agents instead of overwriting them. See [`INSTALL.md`](INSTALL.md).

**Already have Claudio installed and want the latest rules/agents?** Tell your Claude Code session: *"Read UPDATE.md from this repo and update my Claudio install."* It reads the version marker in your `CLAUDE.md`, shows you what changed since then, and merges in only what's new. See [`UPDATE.md`](UPDATE.md).

**Doing it by hand:**

**1. Copy the config files**

Clone this repo into a folder of its own, then copy `CLAUDE.md`, `project-strategy.md`, `templates/` and `hooks/` from the clone into your Claude Code config directory (the full list is in `docs/setup.md`):
- Mac/Linux: `~/.claude/`
- Windows: `%USERPROFILE%\.claude\`

Then delete the repo guard block from the copied `CLAUDE.md` and keep the `claudio-version` line above it, as `docs/setup.md` Step 1 describes.

**2. Wire up the hooks**

Add to your `~/.claude/settings.json` (see `settings.example.json`):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/check_log.js" }] }
    ],
    "PostToolUse": [
      { "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/detect_significant_event.js" }] }
    ],
    "PreToolUse": [
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/check_escritura.js" }] }
    ],
    "Stop": [
      { "hooks": [
        { "type": "command", "command": "node ~/.claude/hooks/check_decision_prose.js" },
        { "type": "command", "command": "node ~/.claude/hooks/check_style.js" }
      ] }
    ]
  }
}
```

The two `Stop` hooks check the reply itself: `check_decision_prose.js` catches a decision handed to you in prose instead of through `AskUserQuestion`, and `check_style.js` checks the mechanizable half of the anti-AI baseline (em dashes, curly quotes, hollow filler, opening preamble) plus one idea per bullet and short paragraphs. Both run after the reply is on screen, so their only remedy is asking for another version: you will occasionally see two near-identical answers. That is the trade-off, and it is why only rules that rarely fire belong there.

**3. Make agents available**

Place the `agents/` folder (or a symlink) at `~/.claude/agents/`. Claude Code loads agents from there automatically.

**4. Open any project**

Start Claude Code in any project directory. Claudio introduces itself, reads or creates the log, and the system is live.

Full walkthrough with edge cases: [`docs/setup.md`](docs/setup.md).

---

## Staying up to date

Claudio ships as files, not a package, so nothing on your machine phones home to check for updates: that is deliberate. To hear about a new version without checking by hand, use GitHub's own release notifications:

1. Open this repository on GitHub.
2. Click **Watch** (top right), choose **Custom**, tick **Releases**, and apply (equivalently, **Watch, Releases only**).

From then on GitHub emails you once each time a new version ships, never per commit and never from anything running locally. When one arrives, follow [`UPDATE.md`](UPDATE.md) to merge the new rules, agents, and hooks into your install while keeping your own changes.

Every version from 2.22.0 on is published as a GitHub Release, so Watch fires on each one. Older tags were not Releases, so a notification for a version before 2.22.0 will not arrive; 2.22.0 is the first you will be told about.

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
