// Blocks a subagent from reverting files with git (checkout, restore, stash, reset --hard,
// clean -f).
//
// Why: with several sessions and subagents in the same folder, `git status` also shows
// someone else's work in progress, and a half-written file looks just like an abandoned
// leftover. A subagent once ran `git checkout` on a file another session was editing. The
// rule against reverting what you didn't touch lives in the main thread's CLAUDE.md and
// doesn't reach the subagent. A subagent has no reason to revert: it reports, and Claudio
// decides the fix with the user.
//
// It tells a subagent apart by the payload's `agent_id` field, which Claude Code only sends
// when the tool call comes from a subagent (hooks docs, "Subagent-Specific Fields"). The
// main thread isn't blocked: the CLAUDE.md rule governs there, and reverting your own work
// is sometimes the right call.
//
// A subagent working in its own worktree (`.claude/worktrees/`) passes: what it reverts
// there is its own.
//
// Each simple command that starts with `git` is checked, not the whole text: a `grep "git
// restore"` or a commit message that names the form is not blocked. `checkout` and `switch`
// are blocked whole: with or without `--`, on a file or on a branch, in the shared folder
// they overwrite another session's work.

const { readPayload } = require('./_lib_stdin')
const { deny } = require('./_lib_hook_salida')
const { statements, commands, words, program, readGit, expandedPath } = require('./_lib_comandos')

// Which form of reverting it is, or null if the subcommand doesn't overwrite files.
function revertingForm(sub, args) {
  const has = re => args.some(a => re.test(a))
  if (sub === 'checkout' || sub === 'switch') return 'git ' + sub
  // `restore --staged` only unstages; with --worktree or -W it touches the file too.
  if (sub === 'restore') return has(/^(--staged|-S)$/) && !has(/^(--worktree|-W)$/) ? null : 'git restore'
  if (sub === 'stash') return ['list', 'show'].includes((args[0] || '').toLowerCase()) ? null : 'git stash'
  if (sub === 'reset') return has(/^--(hard|merge|keep)$/) ? 'git reset --hard' : null
  if (sub === 'clean') return has(/^(--force|-[a-z]*f[a-z]*)$/i) ? 'git clean -f' : null
  if (sub === 'apply') return has(/^(-R|--reverse)$/) ? 'git apply -R' : null
  if (sub === 'checkout-index') return 'git checkout-index'
  if (sub === 'read-tree') return has(/^(-u|--reset)$/) ? 'git read-tree -u' : null
  return null
}

const inWorktree = p => /[\\/]\.claude[\\/]worktrees[\\/]/.test(String(p || ''))

readPayload(json => {
  if (!json || typeof json !== 'object') process.exit(0)
  if (json.tool_name !== 'Bash' && json.tool_name !== 'PowerShell') process.exit(0)
  if (!json.agent_id) process.exit(0)
  let cwd = String(json.cwd || '')
  const cmd = String((json.tool_input || {}).command || '')
  let hit = null
  for (const s of statements(cmd)) {
    for (const c of commands(s)) {
      const w = words(c)
      // A `cd` inside the same command moves the target of what follows.
      if (/^(cd|chdir|set-location|sl|pushd|push-location)$/.test(program(w[0])) && w[1]) {
        cwd = expandedPath(cwd, w[w.length - 1])
        continue
      }
      const g = readGit(w, cwd)
      if (!g) continue
      const found = revertingForm(g.sub, g.args)
      // The worktree exception looks at where the command points (-C, --work-tree), not
      // only at the cwd: from a worktree, `git -C <main> checkout` overwrites the main folder.
      if (found && !inWorktree(g.target)) { hit = found; break }
    }
    if (hit) break
  }
  if (!hit) process.exit(0)
  deny(
    'Blocked: a subagent doesn\'t revert files or switch branches with `' + hit + '` in the shared folder. ' +
    'Another session may have work in progress, and a half-written file looks just like an abandoned ' +
    'leftover. Report what you found and leave the fix to Claudio. If you need to change code to test ' +
    'something, do it on a copy in the scratchpad. If you were only looking for text, use the Grep tool.'
  )
})
