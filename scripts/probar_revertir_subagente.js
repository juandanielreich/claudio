// Tests hooks/check_revertir_subagente.js: a subagent (payload with agent_id) doesn't
// revert files with git; the main thread and a subagent in its own worktree can.
//
// Tests this repo's hooks/ folder, not an installed copy.
// Run: node scripts/probar_revertir_subagente.js (exit code 1 if any case fails)

const { execFileSync } = require('child_process')
const path = require('path'), os = require('os')
const HOOK = path.join(__dirname, '..', 'hooks', 'check_revertir_subagente.js')

let pass = 0, fail = 0
function run(payload) {
  try { return execFileSync('node', [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' }) }
  catch (e) { return 'CRASHED ' + (e.stderr || '') }
}
const blocks = out => { try { return JSON.parse(out).hookSpecificOutput.permissionDecision === 'deny' } catch (_) { return false } }
function chk(name, cond, extra = '') {
  if (cond) { pass++; console.log('  OK    ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' :: ' + extra : '')) }
}
const cwd = path.join(os.tmpdir(), 'test-repo')
const sub = (command, extra = {}) => Object.assign({ tool_name: 'Bash', tool_input: { command }, agent_id: 'test-subagent', cwd }, extra)

console.log('== check_revertir_subagente ==')
const BLOCK = [
  'git checkout -- src/app.js',
  'git checkout HEAD~1 -- a.md b.md',
  'git -C /c/x checkout -- a.md',
  'git checkout .',
  'git restore src/app.js',
  'git restore --worktree .',
  'git stash',
  'git stash push -m tmp',
  'git stash -u',
  'git reset --hard HEAD',
  'git clean -fd',
  'npm test && git checkout -- a.js',
  'git checkout HEAD src/app.js',
  'git checkout abc123 a.md',
  'git checkout a.js',
  'git checkout -f',
  'git checkout -b new-branch',
  'git switch -f main',
  'git switch --discard-changes main',
  'git restore --staged --worktree a.js',
  'git stash -a',
  'git stash --all',
  'git clean --force',
  'git -C "C:/a b" checkout -- a.md',
  'git -C x -c y=1 checkout -- a.md',
  'git --work-tree=. checkout -- a.md',
  'git.exe checkout -- a.md',
  '"git" checkout -- a.md',
  'git reset --merge',
  'git apply -R patch.diff',
]
for (const c of BLOCK) chk('subagent, blocks: ' + c, blocks(run(sub(c))))
chk('subagent in PowerShell too', blocks(run(sub('git checkout -- a.js', { tool_name: 'PowerShell' }))))

const ALLOW = [
  'git status',
  'git diff HEAD~1',
  'git show abc123:src/app.js',
  'git log --oneline -5',
  'git restore --staged a.js',
  'grep -rn "git restore" agents/',
  'grep -n "git reset --hard" CLAUDE.md',
  'echo "do not use git checkout -- x"',
  'git commit -m "avoid git restore and git stash"',
  'git log -S "git clean -f"',
  'git stash list',
  'git stash show -p',
  'git reset HEAD a.js',
]
for (const c of ALLOW) chk('subagent, allows: ' + c, run(sub(c)).trim() === '')

let o = run({ tool_name: 'Bash', tool_input: { command: 'git checkout -- a.js' }, cwd })
chk('main thread (no agent_id) passes', o.trim() === '', o.slice(0, 80))
const wt = path.join(cwd, '.claude', 'worktrees', 'agent-1')
o = run(sub('git checkout -- a.js', { cwd: wt }))
chk('subagent in its own worktree passes', o.trim() === '', o.slice(0, 80))
o = run(sub('git -C "' + cwd + '" checkout -- a.js', { cwd: wt }))
chk('from its worktree, -C to the main folder is blocked', blocks(o), o.slice(0, 80))
o = run(sub('cd "' + cwd + '" && git checkout -- a.js', { cwd: wt }))
chk('from its worktree, cd to the main folder and checkout is blocked', blocks(o), o.slice(0, 80))
for (const raw of ['null', '[]', '', '{bad json']) {
  let out
  try { out = execFileSync('node', [HOOK], { input: raw, encoding: 'utf8' }); chk('payload ' + JSON.stringify(raw) + ' does not crash', out.trim() === '') }
  catch (e) { chk('payload ' + JSON.stringify(raw) + ' does not crash', false, String(e.stderr).slice(0, 80)) }
}
o = run({ tool_name: 'Read', tool_input: { file_path: 'x' }, agent_id: 'test-subagent' })
chk('other tools are left alone', o.trim() === '', o.slice(0, 80))
o = run({ tool_name: 'Bash', tool_input: {}, agent_id: 'test-subagent' })
chk('a payload without command does not crash', o.trim() === '', o.slice(0, 80))

console.log('\n' + pass + ' OK, ' + fail + ' failed')
process.exit(fail ? 1 : 0)
