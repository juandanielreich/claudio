# Writing and editing agents and skills

Condensed principles for editing `agents/*.md`, `CLAUDE.md`, or any skill file — apply them, don't just note them.

## Root principle

An agent/skill exists to remove non-determinism from a probabilistic system. **Predictability** — the model following the same process every time, not producing the same output — is what's being optimized for. Every rule below serves that.

## Checks when editing an existing file

1. **No-op hunt** — is this sentence already the model's default behavior? If so, cut it. ("Be careful" is a no-op; "never do X without confirming Y" is not.)
2. **Duplication** — does this meaning live in more than one file? Collapse to a single source of truth.
3. **Leading words** — is there a long repeated phrase that could anchor to a short term instead? (Claudio already uses several: "DECISIONS MADE", "PENDING".) A good leading word recruits knowledge the model already has from training — it saves tokens and gives a stronger hook for the behavior.
4. **Sprawl** — is the file longer than its purpose justifies? If so, move detail to a linked file (progressive disclosure) and leave only what's always needed in the main file.

## Invocation — model-invoked vs. user-invoked

- **Model-invoked**: the agent can trigger itself, based on its `description`. Costs context every session (the description always lives in the window). Use when the agent needs to reach the skill on its own, or when another skill references it.
- **User-invoked**: only triggers if the user names it explicitly. Zero context cost, but the user has to remember it exists.

## Failure modes to diagnose

- **Premature completion** — the agent declares a step done too early. Fix: a sharper, verifiable definition of "done," not a vague phrase.
- **Sediment** — old layers accumulating because adding feels safe and removing feels risky. Without active pruning, every instruction file tends toward this.
- **Sprawl** — a file too long even if every line is individually valid. Cure: disclosure (split into a linked file) + split by usage branch.

## When to use this reference

- Writing a new agent from scratch.
- Any dedicated audit session of the orchestrator and its existing agents.
