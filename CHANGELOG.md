# Changelog

All notable changes to the Claudio orchestration system are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Releasing:** after bumping the version here, `git tag vX.Y.Z` and push the tag. `UPDATE.md`'s three-way merge depends on every release having a matching tag — a version bumped without a tag breaks it for anyone on that version.

---

## [Unreleased]

---

## [2.15.0] - 2026-07-16

Same day as 2.14.0, and mostly its cleanup. The review agents run over 2.14.0 found that the rule it added was contradicted by this repo's own templates, and that its changelog entry described a change that never happened here.

### Changed

- **The batched session-close menu is now an `AskUserQuestion`, not a prose menu** (`CLAUDE.md` → "Session close procedure"). 2.14.0 added a rule saying every decision goes through `AskUserQuestion` and never through prose — while the file kept prescribing a seven-option prose menu for the most frequent decision in the system. A rule that competes against a template in the same file loses to the template. The same conversion applies to the Impact Analyst and UX Designer accumulate prompts, the new-agent proposal, and the learning proposal.
- **The three mirrors of that menu are now pointers** (`README.md`, `docs/how-it-works.md`, `agents/ARCHITECTURE.md`). They restated the menu as an example and had been showing five options for months after the real one grew to seven. Copying the new format into all three would have rebuilt the same trap; the operative format now has one home.
- **`CLAUDE.md` → the answering rule dropped its rationale block.** "Why this is phrased as an order, not a length" instructed no behavior — it argued for the rule to a human reader, in a file re-sent every turn. Moved to this changelog, which is read once.

### Fixed

- **The 2.14.0 entry claimed a rule was replaced that never existed here.** It described removing "3-4 dense key points" and "context → solution → action" from this repo's `CLAUDE.md`. That text only ever lived in the author's private config; the public file has no personal tone section, so 2.14.0 was a pure addition. The entry was written from the private repo's diff without checking this one.

### Notes

- **Watch for a rule that arrives in absolute form.** "Every decision... never in prose" reads cleanly in isolation, which is exactly why nobody re-reads the rest of the document against it. When a rule is rewritten from permissive to absolute, audit what the file already prescribes under the older, looser version — the absolute form can silently outlaw a pattern the same document still teaches.

---

## [2.14.0] - 2026-07-16

Responses too long to act on. The diagnosis moved the problem: it was never length, it was order — the decision arrived buried under the reasoning that led to it.

### Added

- **`CLAUDE.md` → Rules always active — "Answering — the conclusion opens, the reasoning follows".** The conclusion, decision or question opens the response; the reasoning goes after and is optional. Any decision requiring the user to choose goes through `AskUserQuestion`, never prose — prose buries the choice under the argument, the tool structurally cannot.

### Notes

- **Prescribe an order, not a length.** "Be brief" is a semantic instruction competing against a strong generation pattern — it fails the way language-drift rules fail. Order is different: it says where the answer goes, not how much of it there is. Beware of a rule shaped like "context → solution → action": it reads as a rule about brevity while dictating exactly the shape that buries the answer.
- **The decisive evidence was negative.** A style-compression plugin had been active in every session for months, shortening every response, and the problem persisted throughout — it compresses words but does not reorder. That ruled out length as the variable more firmly than any argument could. Worth remembering before reaching for a "make it shorter" fix: check whether something already shortening the output has already failed to help.
- **Check what the harness already says before writing a formatting rule.** Claude Code's own system prompt instructs "Lead with the outcome". A local rule that contradicts it loses, and a local rule that merely restates it is dead weight in a file re-sent every turn. The clause worth writing was the one the harness does *not* cover: routing decisions to `AskUserQuestion`.

---

## [2.13.0] - 2026-07-16

Findings from a full audit of the agent system. Half of these fix the audit's own first attempt — the review agents caught more than the audit did.

### Added
- **Decision tree, new step 3: "Does it produce an artifact another agent consumes?"** If yes, wire the *consumer*, not just the producer — the reading agent's `.md` must name the artifact, and the artifact goes into "System dependencies" in INDEX.md. This is the layer that should have caught the Strategist→Architect gap and didn't: the Strategist shipped producing `STRATEGY.md`, CLAUDE.md told Claudio to pass it along, and `architect.md` never mentioned it. Agents run in isolated context without CLAUDE.md, so nothing caught the omission.
- **`architect.md` step 0:** read `STRATEGY.md` if it exists — settled framing, not reopened. Closes the chain on the consumer side.
- **`STRATEGY.md` row in INDEX.md "System dependencies".**
- **Pre-flight section in `ARCHITECTURE.md`** (this repo never had it; it dates to an earlier release upstream).
- **QA, system/config lens:** verify scope claims about a hook ("the only exception", "only X touches Y") against the file's full code, not just the section that motivated the change.

### Changed
- **Pre-flight rule reformulated — the important one.** The original said "re-read your rules and confirm compliance", indistinctly. The distinction that was missing: *asking for evidence in the output* (a field that can't be filled without doing the work) is the strong mechanism; *re-reading* only helps when there's something to recover (multiple modes, selective loading); *asking the agent to confirm* never works — that instruction is satisfied by writing that it complied, and the same process that produced the work judges whether the work happened. Applied to an agent with no modes, the original formulation produced a section with no effect. The hand-maintained list of which agents carry pre-flight was replaced by the criterion plus a reasoned exception for fully procedural agents — the list went stale in the same commit that used it.
- **Core principle no longer overclaims.** It said "hooks don't know about agents… adding an agent = only touching CLAUDE.md and INDEX.md", which its own decision tree contradicts ("update check_log.js to detect it") for pre-action agents that accumulate. The exception is now explicit, with a note: before claiming "only X touches Y" about a hook, grep the whole hook.
- **`strategist.md` pins the exact path for `STRATEGY.md`.** It said "alongside where the brief will go", which isn't a path and fails in the normal case — the project directory doesn't exist yet. The producer pins the location; the consumer references it.

---

## [2.12.1] - 2026-07-16

### Changed
- **Pointer rule moved from `File architecture` to `Learning triage at session close`, under the JUDGMENT branch.** It was in the wrong section: `File architecture` governs where *projects* live on disk, while the pointer rule governs where the text of a *rule* lives. Nobody deciding where to put a new rule reads the project-layout section — which is the exact failure mode the rule itself describes. The JUDGMENT branch already says "short rule in the body of CLAUDE.md or the agent, near the decision point"; the pointer rule is the elaboration of that sentence, so it now sits with it.
- **Pointer rule trimmed.** Cut the closing rationale ("this file loads in full every session…") and the restatement of the exception — both argued for the rule rather than deciding any case. The rule, the exception, the test, the examples, and the inline list all survive intact.

### Notes
- Caught by a quality review of the 2.12.0 diff. Two findings, both misfiled by the release itself: the pointer rule landed in a section about a different subject, and a second rule shipped in 2.12.0's Spanish original ("check the qualitative label against the sign of the number") was mechanical rather than judgment, so it belongs on the QA agent's checklist, not in the instruction body. That rule never reached this repo, so only the relocation applies here.

---

## [2.12.0] - 2026-07-16

### Added
- **Pointer rule in `File architecture`.** `CLAUDE.md` holds pointers, not detail: when a section grows past a few lines and only applies in one context, it moves to the agent or skill that needs it. The exception is explicit and matters more than the rule — anything that must fire in *every* session (the destructive-operation prohibition, read-the-log-first, the path rules) stays inline however long it gets, because a rule one hop away can be missed. Rationale: `CLAUDE.md` loads in full in every session of every project, while agents load only when invoked, so extraction moves the cost to where it's used without losing anything.
- **"Measure, don't infer" in `Rules always active`.** Before asserting a trend about anything under version control ("this only grows", "nobody reviews it"), read the `git log`. Applies to the config system itself as much as to project code.

### Notes
- Both rules came out of evaluating [microsoft/SkillOpt](https://github.com/microsoft/SkillOpt) as a possible upgrade to the learning system. **SkillOpt was rejected:** it treats a skill document as trainable weights and needs a held-out benchmark with an objective per-case score to gate edits. Skills whose output is voice or judgment have no such score, so the loop has no signal.
- The evaluation also proposed a formal pruning mechanism (validation gate, retirement file, line budgets). **That was rejected too, by measurement:** `git log` showed the system already self-prunes by judgment — two net contractions in eleven days (one commit cut 24 lines by extracting detail to an agent, another cut 3 as redundancy), plus an audit that landed 16 improvements for a net +5 lines, meaning it cut while it added. The formal mechanism would have been ceremony over something already working, with a rare-but-catastrophic downside: most durable rules exist because of a past disaster and almost never fire, so pruning by usage would delete exactly the ones worth keeping. Only the extraction pattern survived, because a commit already demonstrated it.

---

## [2.11.0] - 2026-07-15

### Added
- **Strategist agent (new).** A framing layer that runs *before* the Architect. It handles the *what* and the *why* — problem, users, functionality alternatives with trade-offs, chosen direction, minimal scope — and is forbidden from touching the technical (stack, data model, files). Delivers `STRATEGY.md`, which the Architect reads as input instead of starting from scratch. Stance is "critical partner": it questions whether the project is worth building and can recommend not building. On-demand, with a proactive Claudio suggestion at the start of a fuzzy new project; skippable when the user already knows what to build.
- **Chain Strategist → Architect → build.** Documented in `agents/ARCHITECTURE.md`: why it's a separate agent rather than a mode of the Architect (the Architect jumps to a single technical solution by design, so mixing framing and design drags stack bias into a phase that shouldn't have a stack yet).

### Changed
- `CLAUDE.md`: added the Strategist to the announcement translation table, the proactive-trigger table (before the Architect), and the new-project rule (offer the Strategist first when the what/why is fuzzy, pass `STRATEGY.md` to the Architect).
- `agents/INDEX.md`, `README.md`: registered the Strategist (now seven agents); the Architect's framing question narrowed from "what should we build?" to "how do we build it?".

---

## [2.10.2] - 2026-07-13

### Fixed
- **QA + Simplify pass on `UPDATE.md` and `docs/setup.md`.** Step 1's fallback conditions now spell out both sub-cases explicitly (no marker → treat as `0.0.0`; marker but no matching tag → use that version) instead of a dangling `0.0.0` reference Step 2B could no longer resolve. Step 2A now does a mechanical `git merge-file --diff3` pass first and only asks the user about sections that actually conflict (and skips asking when both sides converged to the same text) — cheaper than reasoning through every section by hand, and correctly reads "upstream" straight from the checkout instead of an unnecessary `git show HEAD:...` per file. Two redundant bullets describing the same "apply it" outcome were merged into one. Step 3's heading no longer implies the user needs to run `git tag` (they don't — that's this repo's job, not `~/.claude/`). `docs/setup.md`'s "Updating later" section now points to `UPDATE.md` instead of re-explaining the merge mechanism. The tagging requirement for maintainers, previously only a changelog line nobody would re-read at release time, now also lives as a standing note above `## [Unreleased]` and in the private `CLAUDE.md`'s system-paths entry for this repo.

---

## [2.10.1] - 2026-07-13

### Fixed
- **`docs/setup.md` didn't mention the version marker or tagging.** Manual installers following this guide would never get the `<!-- claudio-version -->` marker, so `UPDATE.md`'s three-way merge could never find a base for them. Added a note in Step 1 to keep the marker, and an "Updating later" section pointing to `UPDATE.md` and explaining that forks need their own tags for the three-way merge to work.

---

## [2.10.0] - 2026-07-13

### Added
- **Three-way merge for `UPDATE.md`, backed by git tags.** Every released version from 2.2.0 onward is now tagged (`vX.Y.Z`) in this repo. When a user's installed `claudio-version` marker matches a tag, `UPDATE.md` fetches that tag as the merge base and diffs base→local (the user's own edits) separately from base→upstream (what changed upstream) — it can now tell "you customized this section" apart from "this is just stale," and only asks the user when a section changed on both sides. Installs without a matching tag (pre-2.9.0, before the marker existed) fall back to the previous heading-existence check, documented as Step 2B.

### Changed
- Every future release must be tagged (`git tag vX.Y.Z`) for the three-way merge to work for users on that version — this is now a required release step, not optional bookkeeping.

---

## [2.9.1] - 2026-07-13

### Changed
- **Trimmed the two subagent-delegation rules added in 2.9.0.** A same-session Simplify pass found redundant "why" prose repeated across the rule statement and its "how to apply" paragraph, and a "don't poll" rule that re-derived an instruction already present in the `Agent` tool's own spec. Tightened both to state the rule once and keep only the concrete evidence. Also added a missed half of the lesson: isolating a phase in a subagent isn't license to make it do less work.

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
