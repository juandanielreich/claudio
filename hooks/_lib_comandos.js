// Splits a Bash or PowerShell command into what actually runs, for the hooks that block
// by text (check_kill_por_nombre.js, check_revertir_subagente.js). Not a hook: it has no
// settings.json entry, but those two require it.
//
// Why: matching the whole command text fails in both directions. It blocked a
// `grep "git restore"` or a commit message that only named the form, and it merged two
// separate statements (`Get-Process node; Stop-Process -Id 4567`) as if they were one.
// Statements, commands and quotes are split here once, with the same rules for both hooks.
//
// It is not a shell parser: it doesn't follow external scripts, and only `expandedPath`
// expands variables, with the hook's environment and not the command's. What goes in a
// variable of the command itself or in another file is an accepted escape.

const os = require('os')
const path = require('path')

// PowerShell line continuation (a backtick at the end of a line) joins two lines.
const joinLines = cmd => String(cmd || '').replace(/`\r?\n/g, ' ')

// Walks the text respecting single and double quotes, and cuts where `isCut` returns the
// length of the separator (0 when there is no cut at that position).
function split(text, isCut) {
  const parts = []
  let current = '', quote = null
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quote) {
      current += c
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'") { quote = c; current += c; continue }
    const n = isCut(text, i)
    if (n > 0) { parts.push(current); current = ''; i += n - 1; continue }
    current += c
  }
  parts.push(current)
  return parts.map(p => p.trim()).filter(Boolean)
}

// Statements: what `;`, `&&`, `||` and a newline separate. A pipe and a parenthesis stay
// inside the same statement.
function statements(cmd) {
  return split(joinLines(cmd), (t, i) => {
    if (t[i] === ';' || t[i] === '\n' || t[i] === '\r') return 1
    if ((t[i] === '&' && t[i + 1] === '&') || (t[i] === '|' && t[i + 1] === '|')) return 2
    return 0
  })
}

// Simple commands of a statement: also cuts at `|`, parentheses, braces and the bash
// backtick (command substitution), so `(Get-Process x).Id` or `` `pkill x` `` become
// commands of their own.
function commands(statement) {
  return split(statement, (t, i) => ('|(){}`&'.includes(t[i]) ? 1 : 0))
}

// Words of a command, without the quotes around them.
function words(command) {
  return split(command, (t, i) => (/\s/.test(t[i]) ? 1 : 0)).map(p => p.replace(/^(["'])([\s\S]*)\1$/, '$2'))
}

// The text without what sits inside quotes, to look for forms that run and not for names
// that appear in an argument.
const withoutQuotes = text => String(text || '').replace(/"[^"]*"|'[^']*'/g, '""')

// Program name, without its folder, without `.exe` and in lower case: `C:\x\git.exe` gives `git`.
const program = word => String(word || '').split(/[\\/]/).pop().replace(/\.exe$/i, '').toLowerCase()

// A path as a command writes it, with its variables expanded: `$USERPROFILE`, `${HOME}`,
// `$env:USERPROFILE`, `%USERPROFILE%` and a leading `~`. Without this, a
// `cd "$USERPROFILE/dev/x"` resolved as a literal subfolder that doesn't exist. A variable
// missing from the environment stays as written.
//
// Also `$(pwd)`, `` `pwd` `` and `$PWD`, which are the command's folder and not the hook's,
// and Git Bash paths (`/c/Users/...`), which `path.resolve` would turn into `C:\c\Users\...`.
function expandedPath(base, p) {
  const s = String(p || '')
    .replace(/\$\(\s*pwd\s*\)|`\s*pwd\s*`|\$\{PWD\}|\$PWD\b/g, () => path.resolve(base || '.'))
    .replace(/\$\{(\w+)\}|\$env:(\w+)|\$(\w+)|%(\w+)%/gi, (m, a, b, c, d) => process.env[a || b || c || d] ?? m)
    .replace(/^~(?=$|[\\/])/, os.homedir())
  const bash = process.platform === 'win32' && /^\/(?:cygdrive\/)?([a-zA-Z])(\/|$)(.*)$/.exec(s)
  return path.resolve(base || '', bash ? `${bash[1].toUpperCase()}:\\${bash[3]}` : s)
}

// Git global options that take their value in the next word.
const GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env'])

// Returns { sub, args, target } for a `git ...` command, or null if it isn't git.
// `target` is the folder the command acts on, after `-C`, `--work-tree` and `--git-dir`.
function readGit(w, cwd) {
  if (!w.length || program(w[0]) !== 'git') return null
  let i = 1, target = cwd, gitDir = null, workTree = false
  while (i < w.length && w[i].startsWith('-')) {
    const op = w[i]
    if (GLOBAL_WITH_VALUE.has(op)) {
      if (op === '-C' || op === '--work-tree') target = expandedPath(target, w[i + 1])
      if (op === '--work-tree') workTree = true
      if (op === '--git-dir') gitDir = w[i + 1]
      i += 2
    } else {
      const eq = /^--(work-tree|git-dir)=(.*)$/.exec(op)
      if (eq && eq[1] === 'work-tree') { target = expandedPath(target, eq[2]); workTree = true }
      if (eq && eq[1] === 'git-dir') gitDir = eq[2]
      i += 1
    }
  }
  // Only `--git-dir`: the repo is the folder that contains the `.git` it names.
  if (gitDir && !workTree) {
    const dir = expandedPath(target, gitDir)
    target = path.basename(dir).toLowerCase() === '.git' ? path.dirname(dir) : dir
  }
  return { sub: (w[i] || '').toLowerCase(), args: w.slice(i + 1), target }
}

module.exports = { statements, commands, words, withoutQuotes, program, joinLines, readGit, expandedPath }
