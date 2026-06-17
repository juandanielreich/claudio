# Agents

Claudio ships with 6 specialized agents. Each is a Markdown file with YAML frontmatter that Claude Code reads to assign name, model, tools, and memory scope.

## Agent directory

| Agent | File | Model | Memory | Category | Activates when |
|---|---|---|---|---|---|
| Impact Analyst | `impact-analyst.md` | sonnet | project | Pre-action | Before moving, deleting, or restructuring more than one file |
| UX Designer | `ux-designer.md` | sonnet | — | Pre-action / Post-action | Before new screen · at session close with UI files edited |
| QA | `qa.md` | sonnet | project | Post-action / On-demand | **Session mode:** at session close · **Full mode:** when user requests a full project review |
| Deploy & Infra | `deploy-infra.md` | haiku | — | Post-action (auto) | After a build or deploy |
| Production Auditor | `production-auditor.md` | opus | — | On-demand | Before first deploy · when user requests it |
| Architect | `architect.md` | opus | — | On-demand | New project (Mode A) · strategic review (Mode B) · existing project without PRODUCT.md (Mode C) |

## Taxonomy

**Pre-action agents** are called *before* doing something — when the cost of fixing a mistake afterward is high. Items accumulate in `_claude_log.md` and the agent runs when you're ready.

**Post-action agents** are proposed at session close in a single batched screen. They don't interrupt the work.

**On-demand agents** are available any time — Claudio also *suggests* them (doesn't launch) when it detects the right signal.

## Adding a new agent

Read `ARCHITECTURE.md` before designing a new agent. The key question: does it guide something that hasn't been done yet (pre-action) or verify something already done (post-action)?

Create a `.md` file with YAML frontmatter (`name`, `description`, `model`, `tools`, optional `memory`), add a row to this file and `INDEX.md`, and add the trigger logic to `CLAUDE.md`. That's it — no code changes needed.

## Project memory

QA and Impact Analyst have `memory: project`. Claude Code creates `.claude/agent-memory/<agent>/` inside the project repo with a `MEMORY.md` injected into their system prompt at startup. This memory travels with the repo via `git clone`.

**Important:** add `.claude/agent-memory/` to your commits. Do NOT add it to `.gitignore`. Without this, agent memory is lost when switching machines.
