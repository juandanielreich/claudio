// Blocks writing an absolute path that depends on the username or the machine.
//
// The logic lives in `check()`, which returns the reason or null, so that
// check_escritura.js can run it in the same process as the em-dash check instead
// of paying a node startup for each. It no longer exits the process itself: the
// caller decides that.
const path = require('path')

// Returns { reason, short } if the write should be blocked, or null if this file
// isn't its concern or nothing was found. Never exits the process.
function check(json) {
  const toolName = json.tool_name
  if (toolName !== 'Write' && toolName !== 'Edit') return null

  const toolInput = json.tool_input || {}
  const filePath = toolInput.file_path || ''

  if (/[\\/](node_modules|\.git|dist|build|\.next)[\\/]/.test(filePath)) return null

  const CHECKED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.ps1', '.sh', '.py', '.json', '.jsonc', '.env', '.yaml', '.yml', '.cjs', '.mjs', '.bat', '.cmd']
  const ext = path.extname(filePath).toLowerCase()
  const isEnvFile = path.basename(filePath).startsWith('.env')
  if (!CHECKED_EXTENSIONS.includes(ext) && !isEnvFile) return null

  const content = toolName === 'Write' ? (toolInput.content || '') : (toolInput.new_string || '')
  if (!content) return null

  // The repeated separator tolerates both a plain backslash and the
  // double-escaped form produced when a Windows path is serialized in JSON.
  // Group 1 captures the segment after "Users" so it can be excluded when it's a
  // system folder rather than a username (see NON_USER).
  const HARDCODED_PATH_PATTERNS = [
    /[A-Za-z]:[\\\/]+Users[\\\/]+([A-Za-z0-9_.-]+)[\\\/]*/,
    /\/home\/([A-Za-z0-9_.-]+)\/?/,
    /\/Users\/([A-Za-z0-9_.-]+)\/?/
  ]

  // Segments right after "Users\" that are Windows system folders, not usernames:
  // a path to them is identical on every machine, so it doesn't depend on the user
  // and blocking it would be a false positive. "All Users" and "Default User" have
  // a space, so the char class stops there and captures "All"/"Default" (Default is
  // covered here; "All Users" is legacy and rare).
  const NON_USER = new Set(['public', 'default'])

  // Ignores comments (// # *) so example paths in inline docs or tests
  // aren't blocked (at the cost of missing a real path hidden in a comment).
  const COMMENT_LINE = /^\s*(\/\/|#|\*)/

  let hit = null
  for (let line of content.split('\n')) {
    if (COMMENT_LINE.test(line)) continue
    // Strip a trailing comment (// or #) preceded by whitespace, so a path in a
    // trailing comment is skipped like one on a full comment line. The whitespace
    // is required so a URL's "://" or a UNC "//server" in a string isn't cut.
    line = line.replace(/\s+(\/\/|#).*$/, '')
    for (const re of HARDCODED_PATH_PATTERNS) {
      const m = line.match(re)
      if (m && !NON_USER.has((m[1] || '').toLowerCase())) { hit = m[0]; break }
    }
    if (hit) break
  }
  if (!hit) return null

  return {
    reason: `Hardcoded absolute path detected ("${hit}...") in ${filePath}. Global "System paths" rule (CLAUDE.md): never hardcode a path that depends on the current username or machine. Use an environment variable instead. PowerShell: $env:USERNAME / $env:USERPROFILE; Node.js: os.homedir() or process.env.USERPROFILE; bash: $HOME. Fix and retry.`,
    short: `Hardcoded absolute path detected ("${hit}..."). Use an environment variable instead of the literal, see the "System paths" rule in the global CLAUDE.md.`
  }
}

module.exports = check
