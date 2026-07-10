# Diagnosing failures — a disciplined process

Applies to any workflow that produces a wrong or flaky output — not just code: a report generator, a scheduled job, a data pipeline, an app, equally.

## Core idea

Before guessing why something fails, build a reliable way to make it fail again on demand — a **red signal**: something that goes red when the problem is present and green when it isn't. Without that signal, any fix is a shot in the dark.

## The 6 phases

1. **Build the red signal** — find the simplest way to reproduce the failure on demand (same file/input, same command, same run). This is 90% of the work.
2. **Reproduce and narrow** — confirm it reproduces the exact reported error (not a similar one). Remove one thing at a time (data, steps, config) until you're left with the minimal case that still fails.
3. **Hypothesize** — before touching anything, list 3-5 ranked suspects, each with a clear prediction ("if it's this, changing X should fix it"). Not a single idea. If the project has a documented provider/service migration in the log, "the old instance is still alive" belongs at the top of the ranking — checking it costs one command (the old provider's CLI/dashboard status), not a whole instrumentation session.
4. **Instrument** — test one hypothesis at a time, changing a single thing per pass.
5. **Fix and verify with the same red signal** — not "looks like it works": run the red signal again and confirm green.
6. **Clean up** — remove temporary instrumentation, ask what would have prevented the bug.

## When to run the full loop vs. fix directly

**Fix directly (skip the loop):**
- First occurrence, obvious cause (the error message points straight at it, a typo, a clearly missing null-check).
- Trivial fix, low risk if it goes wrong.

**Use the full loop:**
- Already in KNOWN ISSUES with ≥2 occurrences — the existing CLAUDE.md trigger ("should we dig into it today?") is the natural entry point.
- A quick fix attempt didn't stick, or the bug came back after being "fixed."
- Intermittent / doesn't reproduce the same way every time.
- Affects a critical automation with no visibility into the cause.

**Middle ground:** if the red signal is already free (e.g. "run the same script with the same input" is already trivially reproducible), skip Phase 1 and start directly at Phase 3.

## Examples outside of application code

- **A newsletter or content pipeline**: an edition ships with a badly formatted field → red signal = re-run the same source document and confirm the same error.
- **A generated report/deck**: a slide pulls the wrong data from a source system → red signal = same export, same script run, same field misplaced.
- **A quoting/pricing tool**: a calculation is off for one input → red signal = same client/product input, same wrong calculation, reproducible.
