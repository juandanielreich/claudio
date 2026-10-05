// Reads the payload Claude Code sends to a hook on stdin.
//
// Shared by the hooks that block Bash, PowerShell and Agent calls (check_cwd_sesion.js,
// check_kill_por_nombre.js, check_revertir_subagente.js). Not a hook: it has no
// settings.json entry, but those hooks require it, so it must sit in the same folder.
//
// The callback receives (payload, raw). An empty stdin, or one that doesn't parse, exits
// with code 0 before the callback runs: a hook invoked by hand with no pipe does nothing.

function readPayload(callback) {
  let raw = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', chunk => { raw += chunk })
  process.stdin.on('end', () => {
    if (!raw.trim()) process.exit(0)
    let payload
    try { payload = JSON.parse(raw) } catch (_) { process.exit(0) }
    callback(payload, raw)
  })
}

module.exports = { readPayload }
