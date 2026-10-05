// Tests hooks/check_cwd_sesion.js: blocks Bash, PowerShell and Agent when the session is
// standing in a subfolder of the root, and lets through the cd that goes back.
//
// Tests this repo's hooks/ folder, not an installed copy.
// Run: node scripts/probar_cwd_sesion.js (exit code 1 if any case fails)

const { execFileSync } = require('child_process')
const path = require('path'), os = require('os')
const HOOK = path.join(__dirname, '..', 'hooks', 'check_cwd_sesion.js')

// A toy root built at runtime: it doesn't need to exist on disk.
const root = path.join(os.tmpdir(), 'cwd-test-root')
const sub = path.join(root, 'agents')

let pass = 0, fail = 0
function run(payload, envRoot = root) {
  const env = Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: envRoot })
  if (envRoot === null) delete env.CLAUDE_PROJECT_DIR
  try { return execFileSync('node', [HOOK], { input: JSON.stringify(payload), encoding: 'utf8', env }) }
  catch (e) { return 'CRASHED ' + (e.stderr || '') }
}
const decision = out => { try { return JSON.parse(out).hookSpecificOutput.permissionDecision } catch (_) { return null } }
function chk(name, cond, extra = '') {
  if (cond) { pass++; console.log('  OK    ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' :: ' + extra : '')) }
}
const bash = cmd => ({ tool_name: 'Bash', tool_input: { command: cmd } })
const ps = cmd => ({ tool_name: 'PowerShell', tool_input: { command: cmd } })
const toBash = p => p.replace(/\\/g, '/').replace(/^([a-zA-Z]):/, (_, l) => '/' + l.toLowerCase())

console.log('== check_cwd_sesion ==')
let o = run(Object.assign(bash('ls'), { cwd: root }))
chk('at the root passes', o.trim() === '', o.slice(0, 80))
o = run(Object.assign(bash('ls'), { cwd: sub }))
chk('Bash in a subfolder is blocked', decision(o) === 'deny', o.slice(0, 80))
o = run(Object.assign(ps('Get-ChildItem'), { cwd: sub }))
chk('PowerShell in a subfolder is blocked', decision(o) === 'deny', o.slice(0, 80))
chk('the PowerShell message suggests Set-Location', o.includes('Set-Location'))
o = run({ tool_name: 'Agent', tool_input: { prompt: 'x' }, cwd: sub })
chk('Agent in a subfolder is blocked', decision(o) === 'deny', o.slice(0, 80))
o = run({ tool_name: 'Read', tool_input: { file_path: 'x' }, cwd: sub })
chk('other tools are left alone', o.trim() === '', o.slice(0, 80))

o = run(Object.assign(bash('cd "' + root + '" && ls'), { cwd: sub }))
chk('absolute cd to the root passes', o.trim() === '', o.slice(0, 80))
o = run(Object.assign(bash('cd "' + toBash(root) + '" && ls'), { cwd: sub }))
chk('cd with a Git Bash style path passes', o.trim() === '', o.slice(0, 80))
o = run(Object.assign(bash('cd .. && ls'), { cwd: sub }))
chk('cd .. that reaches the root passes', o.trim() === '', o.slice(0, 80))
o = run(Object.assign(ps("Set-Location -Path '" + root + "'; Get-ChildItem"), { cwd: sub }))
chk('Set-Location -Path to the root passes', o.trim() === '', o.slice(0, 80))
o = run(Object.assign(bash('cd ../.. && ls'), { cwd: path.join(sub, 'qa') }))
chk('cd ../.. from two levels down passes', o.trim() === '', o.slice(0, 80))
o = run(Object.assign(bash('cd qa && ls'), { cwd: sub }))
chk('cd to another subfolder is still blocked', decision(o) === 'deny', o.slice(0, 80))
o = run(Object.assign(bash('echo "cd ' + root + '"'), { cwd: sub }))
chk('a cd inside a string does not count', decision(o) === 'deny', o.slice(0, 80))

o = run(Object.assign(bash('ls'), { cwd: path.join(root, '.claude', 'worktrees', 'branch') }))
chk('a Claude Code worktree passes', o.trim() === '', o.slice(0, 80))
o = run(Object.assign(bash('ls'), { cwd: path.join(os.tmpdir(), 'other-tree') }))
chk('another tree outside the root passes', o.trim() === '', o.slice(0, 80))
o = run(Object.assign(bash('ls'), { cwd: root + '-sibling' }))
chk('a sibling folder with the same prefix passes', o.trim() === '', o.slice(0, 80))
o = run(Object.assign(bash('ls'), { cwd: sub }), null)
chk('without CLAUDE_PROJECT_DIR it does nothing', o.trim() === '', o.slice(0, 80))
o = run(bash('ls'))
chk('without cwd in the payload it does nothing', o.trim() === '', o.slice(0, 80))
if (process.platform === 'win32') {
  o = run(Object.assign(bash('ls'), { cwd: root.toUpperCase() + '\\' }))
  chk('upper case and a trailing backslash are normalized', o.trim() === '', o.slice(0, 80))
}
for (const raw of ['null', '[]', '', '{bad json']) {
  let out
  try { out = execFileSync('node', [HOOK], { input: raw, encoding: 'utf8', env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: root }) }); chk('payload ' + JSON.stringify(raw) + ' does not crash', out.trim() === '') }
  catch (e) { chk('payload ' + JSON.stringify(raw) + ' does not crash', false, String(e.stderr).slice(0, 80)) }
}

console.log('\n' + pass + ' OK, ' + fail + ' failed')
process.exit(fail ? 1 : 0)
