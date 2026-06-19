# Changelog

All notable changes to the Claudio orchestration system are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [2.1.0] - 2026-06-19

### Changed
- **Learning system redesigned.** Replaced passive `## LEARNINGS` accumulation with an active triage protocol at session close. Each candidate learning is now classified into one of three categories:
  - **MECHANICAL** → migrated immediately to the relevant agent's checklist
  - **JUDGMENT** → written as a short rule in the body of the file, near the decision point
  - **HISTORY** → recorded in the project log only; doesn't touch config files
- `## LEARNINGS` sections in all agents are now labeled as **temporary transit zones**, not permanent lists. Entries that remain there are explicit pending triage debt.
- `CLAUDIO'S LEARNINGS` section in CLAUDE.md removed. The three example entries (routing table judgment, hooks vs. prose rules, urgency keywords) were already implemented in the system body. Claudio applies triage but never proposes learnings itself, so it needs no transit zone of its own.
- Batched session close proposal now includes a **Learnings** signal line, so pending candidates surface in the same ritual as QA and UX review.
- Routing table note updated: removed the circular instruction to record judgment calls back into LEARNINGS.
- Learning announcement style simplified: `"Learning recorded in [file]."` (was `"[agent / Claudio]"`).
- Agent-proposed learning flow updated: Claudio now applies triage immediately and asks the user which category before writing anything.

### Added
- **QA checklist — Node.js section:** two new traps:
  - Regex with ambiguous separator pattern + `Math.max` → active false positives
  - Functions copied between scripts diverge silently → verify byte-for-byte or extract to `lib/utils.js`
- **QA checklist — General section:** two new traps:
  - Loop with per-item try-catch but no `failed[]` array → silent failure not reported to user
  - Stale documentation after service/API migration → code updated, docs forgotten
- **QA — PS5.1 checklist:** `npx -y` as an argument inside another command is parsed by PS5.1 as its own flag → always use `npx --yes` (long form)
- **CLAUDE.md:** note added that claims in `ARCHITECTURE.md` or system docs should be verified against the actual file before acting — design docs can fall out of sync with the implementation
- **CLAUDE.md:** note added that skills should include natural language phrases in their frontmatter `description` if they need to activate by conversational intent, not only by explicit `/name` command

### Removed
- All pre-existing `## LEARNINGS` entries across all agents — each was either already present in the corresponding checklist, already stated in the file body, or classified as HISTORY. Net result: same knowledge, enforced at the right layer.

---

## [2.0.1] - 2026-06-18

### Added
- `docs/claudio-agents.png` — visual diagram of the orchestrator and agent tree
- `docs/claudio-agents.drawio` — editable source for the diagram

---

## [2.0.0] - 2026-06-17

Initial public release.

### Added
- **Claudio orchestrator** (`CLAUDE.md`): identity, announcement style, session open/close procedures, git safety rules, context routing table, code hygiene and UX flow rules always active
- **Project log protocol**: `_claude_log.md` as the required session memory, template-driven, with defined sections (LAST SESSION, DECISIONS, KNOWN ISSUES, OPEN QUESTIONS, CURRENT STATE, PENDING, HISTORY)
- **Agent system** with PRE-ACTION / POST-ACTION / ON-DEMAND taxonomy and proactive trigger rules:
  - **Architect** (3 modes): new project design (Mode A), strategic review (Mode B), PRODUCT.md for existing project (Mode C)
  - **QA** (2 modes): session mode (files touched this session) and full mode (entire project against PRODUCT.md), with resilience lens for async code and a deterministic checklist by technology (PS5.1, React/Vite, Firebase)
  - **Impact Analyst**: pre-action analysis of what breaks before deleting or refactoring, with 6-point checklist and non-negotiable exit-mechanism rule
  - **UX Designer**: router toward `/impeccable` commands (shape / critique / polish), with required UI vocabulary audit
  - **Deploy & Infra**: standard deploy process, first-deploy checklist, Worker cron checklist, version single-source rule
  - **Production Auditor**: 9-category pre-deploy audit (security, resilience, secrets, quotas, idempotency, etc.)
- **Hook system** (3 hooks):
  - `check_log.js`: injects log reminder at session start; detects urgency keywords and injects Impact Analyst reminder
  - `detect_significant_event.js`: tracks session state (edits, UI files, deploy, pending items) for the batched close proposal
  - `clear_session_state.js`: resets session state after the close proposal is processed
- **Batched session close proposal**: surfaces QA, UX Designer, and Impact Analyst together at session end instead of calling them ad-hoc
- **PRODUCT.md pre-check**: Claudio updates the product spec directly before the close proposal, no agent or confirmation required
- **Agent memory**: QA and Impact Analyst have `project`-scoped persistent memory (`.claude/agent-memory/`) that travels with the repo in git
- **Semantic versioning** protocol for all deployed projects (single source in `package.json`)
- **Docs**: `agents/ARCHITECTURE.md`, `agents/INDEX.md`, `docs/adapting.md`
