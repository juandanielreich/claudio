// Blocks killing processes by name (taskkill /IM, Stop-Process -Name, pkill, killall).
//
// Why: a process is identified by its PID, not its name. Killing by name also takes down
// the user's own processes with the same name: an agent ran `taskkill /F /IM chrome.exe /T`
// to close a headless Chrome of its own and closed the user's real Chrome window. A rule
// in one agent's file wasn't enough: it covered one agent and depended on it being read.
// Hooks also run for subagents' tool calls, so this covers all of them.
//
// Allowed: killing by PID (`taskkill /PID`, `Stop-Process -Id`, `kill <n>`), the PID the
// agent itself noted when it launched the process.
//
// Known limits: it splits the command into statements with `_lib_comandos.js` and doesn't
// see what goes in a variable, in an external script, or inside a `$(...)` quoted as the
// argument of a text program (`echo "$(taskkill ...)"`).

const { readPayload } = require('./_lib_stdin')
const { deny } = require('./_lib_hook_salida')
const { statements, commands, words, withoutQuotes, program } = require('./_lib_comandos')

// Verbs that kill. `kill` and `spps` are PowerShell aliases of Stop-Process; `\bkill\b`
// with /i also matches the `.Kill()` method.
const KILLS = /\b(Stop-Process|spps|taskkill|Remove-CimInstance)\b|\bkill\b|\bTerminate\b/i

const PATTERNS = [
  { re: /\btaskkill\b[^\n;&|]*[\/-]+im\b/i, what: 'taskkill /IM' },
  // /FI filters by image or window name: it is killing by name with another syntax.
  { re: /\btaskkill\b[^\n;&|]*[\/-]+fi\b/i, what: 'taskkill /FI' },
  // PowerShell accepts any unique prefix of a parameter: -n, -na and -nam all mean -Name.
  { re: /\b(Stop-Process|spps)\b[^\n;|]*\s-(n(a(m(e)?)?)?|ProcessName)(:|\s+)["'$]?[A-Za-z*]/i, what: 'Stop-Process -Name' },
  { re: /(^|[\s;&|(`])(pkill|killall)\s/i, what: 'pkill / killall' },
  { re: /\bwmic\b[^\n]*\bprocess\b[^\n]*\b(name|commandline)\s*(=|like)[^\n]*\b(delete|terminate)\b/i, what: 'wmic process where name=... delete' },
  { re: /\bGetProcessesByName\b/i, what: 'GetProcessesByName' },
  { re: /\b(Win32_Process|Invoke-CimMethod)\b[^\n]*\b(Terminate|Remove-CimInstance)\b/i, what: 'Win32_Process ... Terminate' },
]
// `kill` as an alias of Stop-Process only exists in PowerShell. In bash, `kill -n 9 <pid>`
// and `kill -n TERM <pid>` are legitimate: there -n is the signal.
const KILL_ALIAS = { re: /\bkill\b[^\n;|]*\s-(n(a(m(e)?)?)?|ProcessName)(:|\s+)["'$]?[A-Za-z*]/i, what: 'kill -Name' }

// Programs whose argument is text (search, print, commit): what goes in quotes there
// doesn't run, so it isn't looked at.
const TEXT_PROGRAMS = new Set(['grep', 'rg', 'egrep', 'findstr', 'select-string', 'sls', 'echo', 'printf', 'write-host',
  'write-output', 'git', 'cat', 'type', 'less', 'head', 'tail'])

// Looking processes up by name (or all of them) and killing what comes out in the same
// statement, even "by PID": `Stop-Process -Id (Get-Process chrome).Id`, `Get-Process |
// Stop-Process` or `ps aux | grep x | xargs kill`. Get-Process -Id <n> passes, and two
// separate statements (`Get-Process node; Stop-Process -Id 4567`) are two things.
const LOOKUP = new Set(['get-process', 'gps', 'ps', 'pgrep', 'get-ciminstance', 'gcim', 'get-wmiobject', 'gwmi'])
function looksUpByNameAndKills(statement) {
  const cs = commands(withoutQuotes(statement)).map(words)
  const looksUp = cs.some(w => LOOKUP.has(program(w[0])) && !w.some(x => /^-id$/i.test(x)))
  if (!looksUp) return false
  return cs.some(w => !LOOKUP.has(program(w[0])) && KILLS.test(w.join(' ')))
}

function form(tool, statement) {
  const first = program((words(commands(statement)[0] || '')[0]) || '')
  const text = TEXT_PROGRAMS.has(first) ? withoutQuotes(statement) : statement
  const hit = PATTERNS.find(p => p.re.test(text))
  if (hit) return hit
  if ((tool === 'PowerShell' || /\b(powershell|pwsh)\b/i.test(text)) && KILL_ALIAS.re.test(text)) return KILL_ALIAS
  if (looksUpByNameAndKills(statement)) return { what: 'looking the process up by name and killing it' }
  return null
}

readPayload(json => {
  if (!json || typeof json !== 'object') process.exit(0)
  if (json.tool_name !== 'Bash' && json.tool_name !== 'PowerShell') process.exit(0)
  const cmd = String((json.tool_input || {}).command || '')
  let hit = null
  for (const s of statements(cmd)) { hit = form(json.tool_name, s); if (hit) break }
  if (!hit) process.exit(0)
  deny(
    'Blocked: `' + hit.what + '` kills processes by name and takes down the user\'s own processes with the same name ' +
    '(this is how the user\'s real Chrome got closed once). Kill only the process you launched, by its PID: ' +
    'note the PID when you launch it (`$p = Start-Process ... -PassThru; $p.Id`, or `$!` in bash) and use ' +
    '`Stop-Process -Id <pid>` or `taskkill /PID <pid> /T`. If it is a server of yours and you didn\'t note the PID, get it from its port: ' +
    '`$id = (Get-NetTCPConnection -LocalPort <port> -State Listen).OwningProcess` and then `Stop-Process -Id $id`. ' +
    'If you know neither the PID nor the port, don\'t kill it: note it in your report.'
  )
})
