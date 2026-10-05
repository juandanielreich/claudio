// A single PreToolUse hook for all write checks.
//
// Why: the two checks that run on Write|Edit cover disjoint extensions. The path
// check looks at code and config (.js .ps1 .json .env and company), the em-dash
// check looks at .md. With one process per hook, each write started node twice and
// one of the two existed only to say the file wasn't its concern.
//
// The cost of joining them, not measured in milliseconds: the two checks now share
// a blast radius. If this file throws, both controls are lost at once, and a hook
// that throws neither blocks nor warns. Each check still lives in its own file and
// is still importable alone; this file only dispatches.

// Each check exports check(json, raw) → { reason } or null. First hit
// blocks. The checks cover disjoint files, so order doesn't change the result
// today; if they ever overlap, the first in the list wins.
//
// Each check loads in its own try, because the try around the call below doesn't cover
// `require`: one missing file would take every check down. The missing one is reported
// on stderr and the rest keep running.
const CHECKS = ['./check_hardcoded_paths', './check_no_emdash'].map(file => {
  try { return require(file) } catch (e) {
    process.stderr.write('check_escritura: could not load ' + file + ' (' + (e.code || e.message) + '), skipping it\n')
    return null
  }
}).filter(Boolean)

let inputData = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { inputData += chunk })
process.stdin.on('end', () => {
  if (!inputData.trim()) process.exit(0)

  let json
  try { json = JSON.parse(inputData) } catch (_) { process.exit(0) }

  for (const check of CHECKS) {
    let r
    // A check that throws must not take the others down, the risk of sharing a
    // process. Swallow the error and continue: losing one control is bad, losing
    // all of them is worse.
    try { r = check(json, inputData) } catch (_) { continue }
    if (!r) continue

    // The model receives only permissionDecisionReason, so the full reason goes there.
    // There used to be a `short` version for that field, and the model lost what the
    // long one said about how to proceed. A deny shows no permission prompt where the
    // user would see a different text, so one reason serves both. Same contract as
    // deny() in _lib_hook_salida.js, written out here on purpose: this dispatcher must
    // not depend on a shared file, or one missing file takes both write checks down.
    // *(Holds while: Claude Code passes only permissionDecisionReason to the model on a
    // deny. Observed 2026-10-05.)*
    const output = {
      decision: 'block',
      reason: r.reason,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: r.reason
      }
    }
    console.log(JSON.stringify(output))
    process.exit(0)
  }

  process.exit(0)
})
