# Agent directory — Claudio

Claudio reads this file to know which agents are available before deciding who to call.
To add a new agent: **read [ARCHITECTURE.md](ARCHITECTURE.md) first**, then create its `.md` and add a row to this table.

## Root agents (available in all projects)

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full taxonomy (pre-action vs post-action) and the decision tree for classifying new agents.

| Agent | File | Model | Memory | Category | Activates when |
|---|---|---|---|---|---|
| Strategist | strategist.md | opus | — | On-demand | At the start of a new project, BEFORE the Architect — frames the problem and explores functionality alternatives (the what / why, not the how). Produces STRATEGY.md |
| Impact Analyst | impact-analyst.md | sonnet | project | Pre-action | Before moving, deleting, or restructuring more than one file |
| UX Designer | ux-designer.md | sonnet | — | Pre-action (shape) / Post-action (critique, polish) | Before building a new screen · at session close with UI files edited |
| QA | qa.md | sonnet | project | Post-action / On-demand | **Session mode:** at session close with code edited · **Full mode:** when user requests a full project review (verifies against PRODUCT.md) |
| Deploy & Infra | deploy-infra.md | haiku | — | Post-action (auto) | When a build or deploy runs (binary signal) |
| Production Auditor | production-auditor.md | opus | — | On-demand | Before first deploy · when user requests it |
| Architect | architect.md | opus | — | On-demand | When planning a new project · strategic review · existing project documentation (without PRODUCT.md) |

Model and memory are defined in each `.md`'s YAML frontmatter. See [ARCHITECTURE.md](ARCHITECTURE.md) → "Integration with the native subagent system".

## Project-specific agents

*(none yet — added here when an agent is created for a specific project)*

---

## System dependencies

| File | Used by | Where it lives |
|---|---|---|
| `project-strategy.md` | Architect (New project and Strategic review) — always reads it before operating | Root of the Claudio config folder |
