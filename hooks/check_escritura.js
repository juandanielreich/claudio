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
const path = require('path')

// Each check exports check(json, raw) → { reason, short? } or null. First hit
// blocks. The checks cover disjoint files, so order doesn't change the result
// today; if they ever overlap, the first in the list wins.
const CHECKS = [
  require('./check_hardcoded_paths'),
  require('./check_no_emdash')
]

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

    const output = {
      decision: 'block',
      reason: r.reason,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: r.short || r.reason
      }
    }
    console.log(JSON.stringify(output))
    process.exit(0)
  }

  process.exit(0)
})
