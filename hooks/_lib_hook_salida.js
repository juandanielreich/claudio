// The output object of a PreToolUse hook that blocks, in one place.
//
// Why: `decision` plus `hookSpecificOutput` with `hookEventName`, `permissionDecision`
// and `permissionDecisionReason` is the output contract with Claude Code. If the runtime
// renames a field, every hook that wrote it by hand needs an edit, and the one that gets
// forgotten fails like a missing hook: it neither blocks nor warns. Not a hook: it has no
// settings.json entry, but the hooks that block Bash, PowerShell and Agent require it.
//
// check_escritura.js writes the same object inline on purpose: that dispatcher runs two
// write checks, and a shared file it can't find would take both down at once.

// Hard block: the tool doesn't run and the model receives the reason.
//
// `decision: 'block'` is the top-level field that predates hookSpecificOutput, and it
// goes along for compatibility.
//
// One reason, no short version: the model receives only permissionDecisionReason, and a
// deny shows no permission prompt where the user would read a different text. A `short`
// variant used to go in that field, and the model lost what the long reason said about
// how to proceed (scripts/probar_deny_motivo.js). *(Holds while: Claude Code passes only
// permissionDecisionReason to the model on a deny. Observed 2026-10-05.)*
function deny(reason) {
  console.log(JSON.stringify({
    decision: 'block',
    reason,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  }))
  process.exit(0)
}

module.exports = { deny }
