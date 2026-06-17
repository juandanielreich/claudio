# Adapting Claudio to your workflow

Claudio ships with opinionated defaults: a specific stack, a specific language, a specific set of agents. Here's how to replace each with your own.

---

## Language

The original system runs in Latin American Spanish. The public version is in English. To change to your language:

1. **`CLAUDE.md`** — update the "Language and tone" section to describe how you want Claudio to communicate.
2. **Agent files** (`agents/*.md`) — translate the body content. The frontmatter (`name`, `description`) can stay in English since CC parses it.
3. **`templates/_log_template.md`** — translate the section headers and placeholder text.
4. **`hooks/check_log.js`** — translate the injected messages (the strings in `additionalContext` and `messages.push(...)`). Also update the `URGENCY_KEYWORDS` array to your language's equivalents.

---

## Tech stack

The reference stack is in `project-strategy.md` and repeated in `CLAUDE.md` (under "Reference stack"). Update both.

**Replacing Cloudflare Pages with another host:**
- Remove Cloudflare-specific patterns from `project-strategy.md`
- Update `agents/deploy-infra.md` — the checklist and process are Cloudflare-specific
- Update `hooks/detect_significant_event.js` if your deploy command differs (`wrangler pages deploy` is what it detects)

**Replacing Firebase with another database:**
- Update the stack table in `project-strategy.md`
- Update the "Firebase Authorized Domains" pattern in the patterns table
- Update the "Known traps" section in `agents/qa.md` (the Firebase-specific traps)
- Update `agents/production-auditor.md` (the Firestore quota row in category 7)

**Using a different frontend framework:**
- Update the stack table and file naming conventions in `CLAUDE.md`
- Update the React/Vite traps in `agents/qa.md`

---

## Agents

### Removing an agent

1. Delete the `.md` file from `agents/`
2. Remove its row from `agents/INDEX.md`
3. Remove its trigger logic from `CLAUDE.md` (the taxonomy tables)
4. Remove its row from the announcement table in `CLAUDE.md`

### Adding a new agent

Before designing a new agent, read `agents/ARCHITECTURE.md`. The key question: does it guide something that hasn't been done yet (pre-action) or verify something already done (post-action)?

**Agent file structure:**

```markdown
---
name: my-agent
description: One-line description. Do NOT auto-invoke proactively — Claudio controls timing.
model: sonnet
tools: Read, Grep, Glob, Bash
---

# My Agent

[Body — this is the system prompt]

## LEARNINGS
*(Claudio updates this section at session close with generalizable principles)*
```

**Registration:**
1. Add a row to `agents/INDEX.md`
2. Add the trigger to `CLAUDE.md` (pre-action table, post-action table, or on-demand table)
3. If it's post-action: add detection to `hooks/detect_significant_event.js` if needed
4. Add its announcement row to the announcement table in `CLAUDE.md`

### Changing agent models

Models are set in the frontmatter of each agent file. Default assignments:

| Use case | Recommended model |
|---|---|
| Strategic decisions (once per project) | opus |
| Analysis with nuanced checklist | sonnet |
| Procedural checklist, high frequency | haiku |

---

## The log template

`templates/_log_template.md` is the template for new project logs. Every project that Claudio creates gets a copy. Sections marked `(optional)` can be removed if your projects don't need them.

If you add a new required section, also update the "When to update each section" table in `CLAUDE.md`.

---

## The urgency hook

`hooks/check_log.js` has a `URGENCY_KEYWORDS` array. Add or remove keywords to match how you talk about urgent things:

```js
const URGENCY_KEYWORDS = [
  'critical', 'urgent', 'must not fail', 'cannot fail',
  'crucial', 'high priority', 'top priority'
  // add your own
]
```

---

## Removing the stack entirely

If you don't want an opinionated stack at all:

1. Delete `project-strategy.md`
2. Remove the "Reference stack" section from `CLAUDE.md`
3. Remove the "Architect always reads project-strategy.md" line from `agents/architect.md`
4. The rest of the system (orchestrator, log, agents, hooks) works without it

---

## Keeping your personal config private

If you fork this for personal use and add personal details (your own stack decisions, private project context, etc.), consider keeping your fork private. The agents' `## LEARNINGS` sections will accumulate project-specific details over time.

What's safe to share publicly: the system structure, agent definitions, hooks, log template.
What should stay private: your personal CLAUDIO'S LEARNINGS, project-specific agent memories, anything in `_claude_log.md` files.
