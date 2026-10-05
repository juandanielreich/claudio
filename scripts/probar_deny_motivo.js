// Tests that the reason of a deny that reaches the model is the long one.
//
// Why: the model receives only `permissionDecisionReason`. Up to 2.28.2 the write
// dispatcher put a `short` version there, and the model lost what the long reason said
// about how to proceed (which variable to use, how to get a PID from a port). The other
// suites only look at the decision (`decision` or `permissionDecision`), so they passed
// with that bug in place.
//
// Each case asks for a phrase that appears only in the long text of its hook. It covers
// both paths: the check_escritura.js dispatcher and each hook that calls deny() itself.
//
// Tests this repo's hooks/ folder, not an installed copy.
// Run: node scripts/probar_deny_motivo.js (exit code 1 if any case fails)

const { execFileSync } = require('child_process')
const path = require('path'), os = require('os')
const HOOKS = path.join(__dirname, '..', 'hooks')

let pass = 0, fail = 0
function chk(name, cond, extra = '') {
  if (cond) { pass++; console.log('  OK    ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' :: ' + extra : '')) }
}
function run(hook, payload, env = {}) {
  try {
    return execFileSync('node', [path.join(HOOKS, hook)], { input: JSON.stringify(payload), encoding: 'utf8', env: Object.assign({}, process.env, env) })
  } catch (e) { return 'CRASHED ' + (e.stderr || '') }
}
const parse = out => { try { return JSON.parse(out) } catch (_) { return {} } }

// Built at runtime so this file holds no literal the path check would block.
const B = String.fromCharCode(92)
const fixedPath = 'C:' + B + 'Users' + B + 'someone' + B + 'data.txt'
const EM = String.fromCharCode(0x2014)   // em dash, built at runtime so this file has none of its own
const cwdRoot = path.join(os.tmpdir(), 'deny-reason-root')

const CASES = [
  ['check_escritura.js', 'hardcoded path (dispatcher)',
    { tool_name: 'Write', tool_input: { file_path: path.join(os.homedir(), 'dev', 'x', 'app.js'), content: 'const p = "' + fixedPath + '"\n' } },
    {}, 'Fix and retry'],
  ['check_escritura.js', 'em dash in a .md (dispatcher)',
    { tool_name: 'Write', tool_input: { file_path: path.join(os.homedir(), 'dev', 'x', 'notes.md'), content: 'text ' + EM + ' here\n' } },
    {}, 'which this check ignores'],
  ['check_kill_por_nombre.js', 'kill by name',
    { tool_name: 'Bash', tool_input: { command: 'pkill -f something' } },
    {}, 'Get-NetTCPConnection'],
  ['check_cwd_sesion.js', 'session in a subfolder',
    { tool_name: 'Bash', tool_input: { command: 'ls' }, cwd: path.join(cwdRoot, 'agents') },
    { CLAUDE_PROJECT_DIR: cwdRoot }, 'absolute paths'],
  ['check_revertir_subagente.js', 'subagent reverts',
    { tool_name: 'Bash', tool_input: { command: 'git checkout -- a.js' }, agent_id: 'test-subagent', cwd: path.join(os.tmpdir(), 'deny-reason-repo') },
    {}, 'scratchpad'],
]

console.log('== reason of the deny the model receives ==')
for (const [hook, name, payload, env, phrase] of CASES) {
  const j = parse(run(hook, payload, env))
  const s = j.hookSpecificOutput || {}
  chk(name + ': denies', s.permissionDecision === 'deny', String(s.permissionDecision))
  const reason = String(s.permissionDecisionReason || '')
  chk(name + ': the model receives the long reason', reason.includes(phrase), reason.slice(0, 100))
  chk(name + ': permissionDecisionReason equals reason', reason !== '' && reason === j.reason)
}

console.log(`\n${pass} OK, ${fail} failed`)
process.exit(fail ? 1 : 0)
