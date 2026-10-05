// Blocks Bash, PowerShell and Agent while the session sits in a subfolder of the project
// root.
//
// Why: the Bash and PowerShell tools keep their working directory between calls, so a
// `cd agents` inside one command leaves the whole session standing there. What follows
// fails in two ways: a relative `node scripts/...` breaks (visible), and a subagent
// launched from there writes its memory to `agents/.claude/agent-memory/` (not visible).
// The mitigation used to be a behavior rule ("use absolute paths") and the model forgot it.
//
// `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` in settings.json (see
// settings.example.json) sends the main thread back to the project root after every
// command, which fixes the cause. Claude Code's docs limit that variable to the main
// thread, so this hook stays as the backstop for subagents. *(Holds while: the variable
// exists with that name and scope in Claude Code. Observed 2026-09-29.)*
//
// It reads the real directory the payload carries (`cwd`), not the command text: guessing
// the `cd`s by reading the command fails with quotes, subshells and commit messages, and
// looking at where the session ended up doesn't.
//
// Limits, on purpose:
//   - It only blocks a subfolder of the root. A session in another tree (another repo, a
//     worktree outside the root) passes: that isn't the observed case, and blocking it
//     would break legitimate flows such as EnterWorktree.
//   - The worktrees Claude Code creates live in `<root>/.claude/worktrees/`, inside the
//     root, and pass for the same reason.
//   - The call that ran the stray `cd` isn't blocked (the hook runs first, and at that
//     moment the session was still at the root). The next one is.

const { readPayload } = require('./_lib_stdin')
const { deny } = require('./_lib_hook_salida')
const path = require('path')
const os = require('os')

const IS_WIN = process.platform === 'win32'

// Turns `/c/Users/...` (Git Bash) into `C:\Users\...` and makes everything comparable.
function normalize(p) {
  if (!p) return ''
  let s = String(p).trim()
  const bash = /^\/([a-zA-Z])(\/|$)/.exec(s)
  if (IS_WIN && bash) s = bash[1] + ':' + s.slice(2)
  s = path.resolve(s)
  s = s.replace(/[\\/]+$/, '')
  return IS_WIN ? s.toLowerCase() : s
}

// Expands `~`, `$HOME`, `$USERPROFILE` and `$env:USERPROFILE` at the start of a target.
function expand(target) {
  const home = os.homedir()
  return target
    .replace(/^~(?=$|[\\/])/, home)
    .replace(/^\$env:USERPROFILE/i, home)
    .replace(/^\$\{?(HOME|USERPROFILE)\}?/, home)
}

// If the command starts with a change of directory, returns its resolved target.
function cdTarget(command, cwd) {
  const m = /^\s*(?:cd|chdir|Set-Location|sl|Push-Location|pushd)\s+(?:-(?:Path|LiteralPath)\s+)?(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/i.exec(command || '')
  if (!m) return null
  const raw = expand(m[1] || m[2] || m[3])
  const bash = /^\/([a-zA-Z])(\/|$)/.exec(raw)
  const absolute = path.isAbsolute(raw) || (IS_WIN && bash)
  return normalize(absolute ? raw : path.join(cwd, raw))
}

readPayload(json => {
  if (!json || typeof json !== 'object') process.exit(0)
  const tool = json.tool_name
  if (tool !== 'Bash' && tool !== 'PowerShell' && tool !== 'Agent') process.exit(0)

  const root = normalize(process.env.CLAUDE_PROJECT_DIR)
  const cwd = normalize(json.cwd)
  if (!root || !cwd || cwd === root) process.exit(0)

  const sep = IS_WIN ? '\\' : '/'
  const inside = cwd.startsWith(root + sep)
  const inWorktree = cwd.startsWith(root + sep + '.claude' + sep + 'worktrees')
  if (!inside || inWorktree) process.exit(0)

  // The command that goes back to the root has to be able to run.
  if (tool !== 'Agent') {
    const target = cdTarget((json.tool_input || {}).command, json.cwd)
    if (target === root) process.exit(0)
  }

  const realRoot = process.env.CLAUDE_PROJECT_DIR
  const back = tool === 'PowerShell'
    ? 'Set-Location "' + realRoot + '"'
    : 'cd "' + realRoot.replace(/\\/g, '/') + '"'
  deny(
    'The session is standing in ' + json.cwd + ', a subfolder of the project, because an earlier cd ' +
    'persists between calls. Before going on, go back to the root with a command that starts with: ' + back +
    ' (you can chain the rest after it). From now on use absolute paths or `git -C` instead of cd. ' +
    (tool === 'Agent' ? 'A subagent launched from there would write its memory to the wrong folder.' : '')
  )
})
