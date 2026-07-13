# Changelog

All notable changes to the Claudio orchestration system are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [2.9.0] - 2026-07-13

### Added
- **`UPDATE.md` (new) + version marker.** Existing installs previously had no way to pull in new rules/agents/hooks short of re-reading the whole repo by hand. `CLAUDE.md` now carries a `<!-- claudio-version: X.Y.Z -->` marker; `UPDATE.md` is a runbook (same agent-driven pattern as `INSTALL.md`) that reads that marker, diffs it against `CHANGELOG.md`, and merges in only what's new — skipping headings the user already has, flagging real conflicts instead of overwriting, and bumping the marker when done. `INSTALL.md` now detects an existing marker and redirects to `UPDATE.md` instead of re-running first-install logic. `README.md` Quick Install cross-links both paths.

---

## [2.8.0] - 2026-07-13

### Added
- **"Delegate heavy phases to subagents" (new rule).** Any session phase that generates a lot of context not needed in full for the rest of the session (web search results, large log/file dumps, broad codebase exploration) should delegate to a subagent that returns only the compact result — its context doesn't get re-sent on every subsequent turn. Measured in a real session: 19 inline web searches accounted for ~90% of that session's token cost via repeated cache-read of accumulated context; fixed by moving the search phase to a subagent.
- **"Don't manually poll background subagents" (new rule).** Never use a `ScheduleWakeup`/`SendMessage`/`TaskOutput` loop to check whether a background agent finished — the harness notifies automatically. Same session: 14 polling turns cost ~230k weighted tokens for nothing.

---

## [2.7.0] - 2026-07-10

### Added
- **`INSTALL.md` (new).** A runbook written for an AI agent, not a human — a user can tell their own Claude Code session "read INSTALL.md from this repo and install Claudio into my global profile" and have it merge safely: detects an existing `CLAUDE.md`/`settings.json`/`agents/`, asks before replacing vs. appending, merges the `hooks` array instead of overwriting `settings.json`, and resolves the `<your-config-dir>` placeholder to the real path instead of leaving it in a live config. Explicitly tells the installing agent not to treat the repo's own `CLAUDE.md` as its current-session behavior.
- Cross-links added: `README.md` Quick Install now mentions the agent-driven path; `docs/setup.md` points to `INSTALL.md` for anyone with a pre-existing config; `PRODUCT.md` main flows list the install path.

---

## [2.6.0] - 2026-07-10

### Added
- **Project log — KNOWN ISSUES format enforced.** New required entry format (Occurrences, Symptom, Root cause, Current mitigation, Status), one entry per problem updated in place rather than duplicated. At session start, entries with ≥2 occurrences are proactively surfaced to the user.
- **`docs/diagnosing-failures.md` (new).** A disciplined 6-phase diagnosis process (red signal → reproduce/narrow → hypothesize → instrument → fix+verify → cleanup) for any recurring or flaky failure — not just code. Wired to the KNOWN ISSUES ≥2-occurrences trigger.
- **`docs/writing-great-skills.md` (new).** Condensed principles for editing agent/skill `.md` files: no-op hunt, duplication, leading words, sprawl, model-invoked vs. user-invoked, common failure modes. Referenced from the agent system section of CLAUDE.md.
- **DECISIONS MADE — 3-test filter.** A decision is only logged if it's hard to reverse, surprising without context, and a genuine trade-off. Keeps the log from accumulating decisions that don't need to survive the session.
- **CONTEXT.md — per-project domain glossary.** Created lazily, on the first ambiguous or repeated domain-specific term. Lives next to `PRODUCT.md`, updated inline as terms get resolved.
- **Log size — archiving convention.** LAST SESSION holds only the latest session; once a log exceeds ~800 lines, HISTORY entries older than a month move to `_claude_log_archive.md` with a pointer line left behind.
- **Pending requests to the user.** If the user postpones an out-of-conversation action Claudio asked for (dashboard, signup, infra confirmation), it's written to PENDING in that same turn instead of relying on conversation memory.
- **Credential-grep checklist before migrating a project to git.** Before `git init`/`gh repo create`, grep for plaintext credential patterns across all included files — not just `.env`, but config files like `.claude/settings.local.json` that can carry credentials embedded in allowed commands.
- **Simplify as a batched post-action option.** Added alongside QA and UX Designer in the session-close proposal, with guidance on when mid-session logic is "settled enough" to be worth reviewing for duplication.

---

## [2.5.0] - 2026-07-01

### Added
- **Generic and portable paths rule.** New always-on rule in CLAUDE.md ("General rule — paths are always generic and portable"): no absolute path depending on the current username or machine may be hardcoded in code, scripts, configs, or documentation. Covers PowerShell/bash scripts, app code, config files, and operational docs. Explicit exception for values that are legitimately fixed (external resource IDs, hosting project names).
- **`check_hardcoded_paths.js` (new hook, PreToolUse).** Blocks any `Write`/`Edit` on code/script/config files that contains a hardcoded absolute path with a username (`C:\Users\<name>\...`, `/home/<name>/...`, `/Users/<name>/...`). Exits silently when there's no violation. Skips `node_modules`, `.git`, `dist`, `build`, `.next`, and comment lines (trade-off: a real path hidden inside a comment isn't caught). Does not check `.md` files.
- `settings.example.json`, `hooks/README.md`, `docs/setup.md`, `docs/how-it-works.md`: updated to document the new `PreToolUse` wiring and hook.

---

## [2.4.0] - 2026-06-25

### Added
- **Debug Logging standard.** New always-on rule in CLAUDE.md: every React/Vite project gets `src/lib/logger.js` — a minimal helper that logs stage-named events in dev and errors only in production (`[stage] event data`). Naming convention: `domain/operation` in lowercase (e.g. `firebase/auth`, `pdf/parse`). For Workers and Node scripts, the same naming convention applies using `console.log` directly. The helper is also added to the file naming conventions table and the new-projects scaffold rule.
- **`restore.ps1`: Firebase and Railway token age.** The restoration summary now shows the backup date and age in days for both Firebase and Railway tokens, making it easy to spot stale credentials before starting work on a new machine.
- **Architect diagram updated.** Both drawio files updated with descriptive mode names (was: Mode A/B/C; now: *New project* / *Strategic review* / *Existing project documentation*).

---

## [2.3.0] - 2026-06-24

### Added
- **`check_log.js`: pending learnings detection.** The hook now scans agent `.md` files at every message and alerts if any `## LEARNINGS` section contains real entries (as opposed to the transit-zone instruction boilerplate). Previously, learnings proposed by agents during a session could sit unprocessed indefinitely with no reminder. The detection filters out the standard `*(Transit zone:...)` line and only fires on actual entries.

---

## [2.2.0] - 2026-06-24

### Changed
- **QA trigger generalized.** The activation signal changed from "any code file edited" to "any file edited in the session." QA now works across all project types — not just React/Vite apps.
- **QA process restructured around four lenses.** The agent now classifies the work first (Step 0) and applies the appropriate lens: *App code* (existing flow verification + known-traps checklist), *System/config* (consistency between CLAUDE.md and agents, dead references, transit zone format), *Written content* (content matches intent, tone, format), *Generated output* (script ran clean, output exists, content matches source data). For mixed sessions, each relevant lens is applied. If work doesn't fit any lens, QA declares it explicitly rather than running an inadequate process.
- **Architect modes renamed from letters to descriptive names.** Mode A → *New project*, Mode B → *Strategic review*, Mode C → *Existing project documentation*. All references in CLAUDE.md, ARCHITECTURE.md, INDEX.md, and the agent file updated. No behavioral change — purely ergonomic: agent completion messages and Claudio announcements now use the descriptive name directly.
- **Reference stack: Firebase note added.** Firebase Auth + Firestore is correct when there are multiple users, roles, or complex auth. For single-editor CRUDs without those needs, the stack now explicitly recommends evaluating Cloudflare KV/R2 first.
- `ARCHITECTURE.md`: QA signal description updated to match the new trigger.

### Added
- **QA checklist — React/Vite:** `useRef` with debounce on a mutable-key resource (e.g., week ID, item ID) → the load effect must call `clearTimeout(debounceRef.current)` before setting new state. Without this, the pending timer writes over the new document (silent corruption).
- **QA checklist — Node.js:** three new traps from real-world bot/automation failures:
  - WebSocket/bot connection state as a one-shot Promise → stays resolved after disconnect. Use a boolean flag (`open`/`close` events) + polling with explicit timeout.
  - Bots/automations with no operational alerts → silent failure is worse than no bot. Alert function must have internal try/catch to avoid recursion.
  - Unofficial or fast-moving dependencies without pinned exact version → lockfile isn't enough in fresh environments. No `^` or `~` for libs like Baileys, scrapers, or unofficial API wrappers.

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
