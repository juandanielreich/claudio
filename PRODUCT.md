PRODUCT.md — Claudio (public product — as-built of the shared system)

What it is:
Claudio is an open-source orchestration layer on top of Claude Code (Anthropic's CLI) that converts the individual assistant into a coordinated development team. A central orchestrator reads project memory before each task, decides when to call specialized agents (QA, impact analysis, architecture, UX, deploy, production audit), and enforces process rules via hooks. Audience: developers who use Claude Code and want a structured workflow — with persistent per-project memory and automatic reviews — instead of a stateless assistant between sessions.

Main flows:
- At session start in a project → Claudio reads _claude_log.md (memory) and summarizes the state in one line before acting.
- When requesting a change that touches multiple files → Claudio detects the signal and offers to call the Impact Analyst before implementing.
- When using urgency words ("critical", "must not fail") → a hook injects the reminder and the Analyst is called without asking.
- At session close with edited code → Claudio proposes QA, UX review, and/or pending analysis in a single screen (without interrupting during work).
- When describing a new project → Claudio suggests the Architect, who produces a construction brief and PRODUCT.md before coding.
- At session end → Claudio updates the log and, if something is generalizable, records a learning in the corresponding agent (the team improves itself).
- Installing → a user can either follow docs/setup.md by hand, or point their own Claude Code session at INSTALL.md and ask it to install — it merges into an existing global config instead of overwriting it.

Current design decisions:
- Orchestrator defined in global CLAUDE.md (loaded in every session).
- Per-project memory in _claude_log.md (read before any task).
- 6 agents with YAML frontmatter (name, description, tools, model, memory); invoked as native CC subagents.
- Pre-action / post-action / on-demand taxonomy (see agents/ARCHITECTURE.md).
- Real enforcement via hooks (not just prose rules): urgency keyword detection, session state accumulation, close reminders.
- Opinionated reference stack (React+Vite+Firebase+Cloudflare) — adaptable.

Out of scope (v1 public):
- Personal backup/restore system (restore.ps1, restore-config).
- Migration Auditor (depends on unpublished restore system).
- Personal project integrations from the original author.
- Third-party skills (impeccable, debate).
- Not a fork or replacement of Claude Code: it's a configuration layer on top. Requires Claude Code installed.
- Does not install or manage API keys or credentials for the user.
