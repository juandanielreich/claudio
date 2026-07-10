---
name: repo-purpose-and-scope
description: What claudio-public is, how it's maintained, and what PRODUCT.md declares out of scope
metadata:
  type: project
---

`claudio-public` is a sanitized, public mirror of the author's private Claudio orchestration system (`OneDrive\claude-config`). Changes are ported periodically from the private config into this repo (via `git log --since=... ` diff on the private repo, per this project's own `_claude_log.md`), then generalized (personal project names, incidents, dates removed) before committing.

`PRODUCT.md` → "Out of scope (v1 public)" is the authoritative list of things intentionally excluded from this public repo: personal backup/restore system (`restore.ps1`, `restore-config`), Migration Auditor, personal project integrations, and third-party skills (`impeccable`, `debate`). Any new CLAUDE.md rule that references an external tool/skill by slash-command (like `/impeccable` or `/simplify`) should be checked against this list — if the tool isn't shipped in this repo, it belongs here too, with the same "third-party, bring your own" framing `ux-designer.md` uses for `/impeccable`. See [[stale-mirrors-of-claude-md]] for a related drift risk.
