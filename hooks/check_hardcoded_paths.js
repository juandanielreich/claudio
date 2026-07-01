const path = require('path')

let inputData = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { inputData += chunk })
process.stdin.on('end', () => {
  if (!inputData.trim()) process.exit(0)

  let json
  try { json = JSON.parse(inputData) } catch (_) { process.exit(0) }

  const toolName = json.tool_name
  if (toolName !== 'Write' && toolName !== 'Edit') process.exit(0)

  const toolInput = json.tool_input || {}
  const filePath = toolInput.file_path || ''

  if (/[\\/](node_modules|\.git|dist|build|\.next)[\\/]/.test(filePath)) process.exit(0)

  const CHECKED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.ps1', '.sh', '.py', '.json', '.env', '.yaml', '.yml', '.cjs', '.mjs', '.bat', '.cmd']
  const ext = path.extname(filePath).toLowerCase()
  const isEnvFile = path.basename(filePath).startsWith('.env')
  if (!CHECKED_EXTENSIONS.includes(ext) && !isEnvFile) process.exit(0)

  const content = toolName === 'Write' ? (toolInput.content || '') : (toolInput.new_string || '')
  if (!content) process.exit(0)

  // The repeated separator tolerates both a plain backslash and the
  // double-escaped form produced when a Windows path is serialized in JSON.
  const HARDCODED_PATH_PATTERNS = [
    /[A-Za-z]:[\\\/]+Users[\\\/]+[A-Za-z0-9_.-]+[\\\/]*/,
    /\/home\/[A-Za-z0-9_.-]+\/?/,
    /\/Users\/[A-Za-z0-9_.-]+\/?/
  ]

  // Ignores comments (// # *) so example paths in inline docs or tests
  // aren't blocked — at the cost of missing a real path hidden in a comment.
  const COMMENT_LINE = /^\s*(\/\/|#|\*)/

  let hit = null
  for (const line of content.split('\n')) {
    if (COMMENT_LINE.test(line)) continue
    for (const re of HARDCODED_PATH_PATTERNS) {
      const m = line.match(re)
      if (m) { hit = m[0]; break }
    }
    if (hit) break
  }
  if (!hit) process.exit(0)

  const output = {
    decision: 'block',
    reason: `Hardcoded absolute path detected ("${hit}...") in ${filePath}. Global "System paths" rule (CLAUDE.md): never hardcode a path that depends on the current username or machine. Use an environment variable instead — PowerShell: $env:USERNAME / $env:USERPROFILE; Node.js: os.homedir() or process.env.USERPROFILE; bash: $HOME. Fix and retry.`,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `Hardcoded absolute path detected ("${hit}..."). Use an environment variable instead of the literal — see the "System paths" rule in the global CLAUDE.md.`
    }
  }

  console.log(JSON.stringify(output))
  process.exit(0)
})
