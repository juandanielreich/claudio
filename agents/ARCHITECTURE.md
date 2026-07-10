# Agent system architecture — Claudio

Read this file **before creating or modifying any agent**. It contains the agreed design principles and the decision tree for classifying new agents.

---

## Core principle

Hooks don't know about agents. Agents aren't hardcoded in any script. The only place where the intelligence of "when to use which agent" lives is CLAUDE.md. Adding a new agent = only touching CLAUDE.md and INDEX.md.

---

## System files

| File | Purpose |
|---|---|
| `agents/*.md` | Definition of each agent (YAML frontmatter + body) |
| `ARCHITECTURE.md` | This file — system design |
| `INDEX.md` | Agent directory so Claudio knows what exists |
| `project-strategy.md` | Reference stack and principles the Architect **always** reads before operating. Not an agent — it's a dependency of the Architect (New project and Strategic review). |

---

## Taxonomy

### Pre-action agents
Called **before** doing something. Whether to block the work is the user's decision. Items accumulate in the log to avoid interrupting the flow.

**Pattern:**
1. Claudio detects the intent (before acting)
2. Asks the user: "Should I [action]? Analyze now or accumulate?"
3. If "accumulate" → writes item in the corresponding section of `_claude_log.md`
4. Hook `check_log.js` detects the section and reminds on each message
5. When the user gives the OK (or at session close) → agent runs with all accumulated items
6. After running → delete that section from the log

**Current pre-action agents:**
- **Impact Analyst** → section `## PENDING IMPACT ANALYSIS`
- **UX Designer (shape)** → section `## PENDING DESIGN`

**How to know if an agent is pre-action:**
Ask: "Does calling it after the work is done make sense?" If no (because it's already done, or the correction cost is high), it's pre-action.

---

### Post-action agents
Called **after** the work is done, at session close. They don't interrupt the flow. Always proposed — no judgment about whether they "apply" or not.

**Pattern:**
1. Hook `detect_significant_event.js` accumulates signals in session state (`claude_session_${hash}.json`)
2. Hook `check_log.js` injects the signal summary into each message
3. At session close → Claudio presents a batched proposal with all applicable agents
4. User responds (A/B/C/D/E)
5. Selected agents run
6. State is cleared: `node "~/.claude/hooks/clear_session_state.js"`

**Current post-action agents:**
- **QA** → signal: any file edited in the session (process adapts its lens based on the type of work)
- **UX Designer (critique/polish)** → signal: any UI file (.jsx, .tsx, .html, .css) edited
- **Deploy & Infra** → signal: build or deploy executed (auto-call, binary signal)

**How to know if an agent is post-action:**
Ask: "Does this agent verify something that was already done?" If yes → post-action.

---

### Why there are no file thresholds
Projects are heterogeneous: some have 40 React components, others are a single HTML file. A threshold of "3 files edited" fails for single-file projects. The correct rule is: **any edit activates the signal**. The user decides in the batched proposal whether the agent is needed.

---

## The cross-session accumulation mechanism

Session state (`claude_session_${hash}.json`) persists in the temp directory between sessions. It's not deleted automatically. It's only deleted when:
- The user responds to the batched proposal and agents run
- The user explicitly asks to clear the state

The `## PENDING IMPACT ANALYSIS` section in the log also persists between sessions (it lives in the log). It's deleted manually after the Analyst runs.

**Sprint + review flow:**
- Sprint (multiple sessions): work fast, accumulate signals
- Review moment: respond "A" to the proposal → all agents run with the full picture

---

## On-demand

Any agent can be called at any time, independent of the proactive system. The user can say "call QA", "analyze impact" directly. The proactive system is the safety net for when nobody asks.

---

## PRODUCT.md — project reference anchor

Every code project must have a `PRODUCT.md` in its root. It's the document that describes what the product *is* (not how it was built), and allows QA to do full reviews without depending on session context.

**Who creates it:**
- New project → Architect produces it as the **second deliverable of New project**, in the same session as the brief. The brief describes how to build the product; PRODUCT.md describes what the product will be. They're complementary documents with different audiences: brief → Claudio executes; PRODUCT.md → QA verifies.
- Existing project without it → Architect generates it by reverse engineering (Existing project documentation): reads code + log → produces draft → user validates

**Who updates it:** Claudio, when it detects a product change (new feature, modified flow, scope decision).

**When its absence is detected:** At session start in a code project. Claudio mentions the absence once per project and offers to create it. If the user says "later", it won't ask again in that session.

**What it contains (minimum structure):**
- What the product is and who uses it
- Main flows (format: "When X → Y happens")
- Current technical decisions
- Out of scope

**How QA uses it:** in Full mode (on-demand), QA verifies the entire project against `PRODUCT.md`. In Session mode (normal close), QA doesn't need it — it only reviews what changed.

---

## Discarded decisions

This section documents alternatives that were considered and why they weren't chosen. Prevents re-debating the same things in future sessions.

| Date | Alternative considered | Why it was discarded |
|---|---|---|
| 2026-06-15 | Automatic mid-session trigger: Claudio detects "I finished X" via natural language and fires QA without asking | Generates noise, false positives, interrupts the flow. Not standard practice in any tool in the ecosystem. Replaced by: explicit on-demand from user + QA full mode |
| 2026-06-15 | Mid-session batched proposal (similar to close) when detecting many changes | Would require frequent user inputs — the constraint was exactly the opposite: one instruction → autonomous execution |

---

## UX Designer and /impeccable

The UX Designer has no design intelligence of its own. It's a trigger router: it decides WHEN and WHICH `/impeccable` command to use. The real capability lives in `/impeccable`.

**Prerequisite for any `/impeccable` command:**
Verify that `PRODUCT.md` exists in the project. If not → `/impeccable init` first.

---

## Decision tree for a new agent

```
1. Does the agent guide something that hasn't been done yet?
   Yes → PRE-ACTION
     → Does it need to accumulate items between actions?
       Yes → Add section to log, update check_log.js to detect it
       No → Direct question to user when intent is detected
   No → POST-ACTION
     → Is the activation signal binary (happened or not)?
       Yes → Auto-call (like Deploy & Infra)
       No → Batched proposal at session close

2. Does the current hook already detect the signal?
   Yes → Only add to CLAUDE.md and INDEX.md
   No → Add detection in detect_significant_event.js

3. Does it have its own specialized intelligence or does it delegate to a tool?
   Own → Create .md with the detailed process
   Delegates → .md is a routing table toward the tool (like ux-designer.md)
```

---

## Batched proposal format (at session close)

**PRODUCT.md pre-check (Claudio, before the proposal):** if any feature was added, modified, or discarded this session → update `PRODUCT.md` right now. No agent needed — Claudio edits it directly. It's a 1-2 minute edit.

```
Closing session — [project]

Signals:
  • [N] edits in: [files]
  • UI files: [list or "none"]
  • Build/deploy: [yes/no]
  • Analyst pending: [N items or "none"]
  • PRODUCT.md: [up to date / updated this session / doesn't exist]
  • Learnings: [none / N candidate(s) → triage now]

What do we process?
  [A] All (includes Simplify)  [B] All except Simplify  [C] QA only  [D] UX Designer only  [E] Analyst only  [F] Simplify only  [G] Later
```

---

## Integration with Claude Code's native subagent system

Since 2026-06-13, agents are **CC native subagents**: each `.md` in `agents/` has YAML frontmatter that CC reads to assign name, model, tools, and memory. Agents must be in `~/.claude/agents/` to be visible across all projects — copy or create a symlink from your config folder. Files without a `name` frontmatter (INDEX.md, ARCHITECTURE.md) are ignored — they're not agents.

### Model per agent

| Agent | Model | Reason |
|---|---|---|
| architect | opus | High-impact strategic decision, once per project |
| production-auditor | opus | 9 categories with implicit states, high stakes, infrequent |
| qa | sonnet | Frequent, requires real capability (resilience lens) |
| impact-analyst | sonnet | Refined checklist, medium frequency |
| ux-designer | sonnet | Router with contextual judgment |
| deploy-infra | haiku | 100% procedural, follows checklist |

Claudio (main agent) runs on Sonnet by default (configured in CC's UI, not in `settings.json`). Switch to Opus with `/model` for strategic sessions. Claudio's model does **not** migrate automatically with the system — it requires manual configuration in the UI.

### Persistent memory (project scope)

QA and Impact Analyst have `memory: project`. CC creates `.claude/agent-memory/<agent-name>/` **inside the project repo**, with a `MEMORY.md` that is injected into their system prompt at startup.

- **Why project scope and not user:** project-specific memory lives in the repo and migrates with `git clone`. `user` memory would live in `~/.claude/agent-memory/` (local, doesn't migrate).
- **Git Safety rule:** `.claude/agent-memory/` must be committed and NOT in `.gitignore`. Without commit + push, memory doesn't migrate to a new machine. Check the `.gitignore` of each repo where a memory-enabled agent is activated.
- **Activating memory forces Read/Write/Edit** on that agent. The QA and Analyst bodies clarify that Write/Edit are only for their memory folder, never for project code.

### Agent memory vs LEARNINGS vs Claudio memory

| Layer | Scope | Where it lives | Who curates it |
|---|---|---|---|
| Agent memory (`memory: project`) | One specific project | `.claude/agent-memory/<agent-name>/` in the repo | The agent itself |
| Agent LEARNINGS section | Generalizable to any project | The agent's `.md` in `<your-config-dir>` | Claudio at close |
| Claudio memory (`~/.claude/.../memory/`) | Global user preferences | Local machine | Claudio |

### Auto-dispatch and Claudio's timing control

CC can auto-delegate to a subagent when a task matches its `description`. This would conflict with Claudio's taxonomy (pre/post-action, batched proposal at close). Mitigation: **every `description` includes "do NOT auto-invoke proactively"** and describes invocation as manual by Claudio.

No auto-dispatch cases reported since implementation (2026-06-13). If in the future any agent auto-fires, harden its `description`. Note: subagents are loaded at session start — any change to `description` requires restarting CC.

---

## Design decision history

| Date | Decision | Why |
|---|---|---|
| 2026-06-08 | Pre/post-action taxonomy | The agent's timing is a fundamental property of the work, not an implementation detail |
| 2026-06-08 | No file thresholds | Heterogeneous projects (1 HTML vs 40 components) break them |
| 2026-06-08 | Batched proposal instead of separate questions | Reduces friction, allows answering everything at once |
| 2026-06-08 | Cross-session accumulation | Allows working in sprints and reviewing everything together |
| 2026-06-08 | UX Designer delegates to /impeccable | /impeccable has the capability; the agent has the criterion of when |
| 2026-06-08 | Post-action always proposes (no "applies/doesn't apply") | Claudio's judgment about significance has historically failed |
| 2026-06-13 | Agents as CC native subagents | Enables declarative model/tools/memory without custom invocation logic |
| 2026-06-13 | Model per agent (opus/sonnet/haiku) | Matches cost and capability to the task: Haiku for procedural, Opus for strategic |
| 2026-06-13 | `memory: project` in QA and Analyst | Project-specific knowledge that grows between sessions and migrates with the repo |
| 2026-06-13 | Agents in `~/.claude/agents/` with symlink/copy from config | Single versioned source; agents are visible across all projects |
| 2026-06-15 | PRODUCT.md as project reference anchor | Established standard (Spec-Driven Development): QA can verify the full project without depending on session context. Architect (Existing project documentation) creates it retroactively for existing projects |
