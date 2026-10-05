// Tests hooks/check_kill_por_nombre.js: blocks killing processes by name and lets
// through killing by PID.
//
// Tests this repo's hooks/ folder, not an installed copy.
// Run: node scripts/probar_kill_por_nombre.js (exit code 1 if any case fails)

const { execFileSync } = require('child_process')
const path = require('path')
const HOOK = path.join(__dirname, '..', 'hooks', 'check_kill_por_nombre.js')

let pass = 0, fail = 0
function run(tool, command) {
  try { return execFileSync('node', [HOOK], { input: JSON.stringify({ tool_name: tool, tool_input: { command } }), encoding: 'utf8' }) }
  catch (e) { return 'CRASHED ' + (e.stderr || '') }
}
const blocks = out => { try { return JSON.parse(out).hookSpecificOutput.permissionDecision === 'deny' } catch (_) { return false } }
function chk(name, cond, extra = '') {
  if (cond) { pass++; console.log('  OK    ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' :: ' + extra : '')) }
}

console.log('== check_kill_por_nombre ==')
const BLOCK = [
  ['PowerShell', 'taskkill /F /IM chrome.exe /T'],
  ['Bash', 'taskkill -im node.exe -f'],
  ['PowerShell', 'Stop-Process -Name chrome -Force'],
  ['PowerShell', 'Stop-Process -ProcessName "node"'],
  ['PowerShell', 'Get-Process chrome | Stop-Process -Force'],
  ['PowerShell', 'Get-Process -Name msedge* | Stop-Process'],
  ['PowerShell', 'gps node | kill'],
  ['Bash', 'pkill -f vite'],
  ['Bash', 'npm test; killall node'],
  ['PowerShell', 'wmic process where name="chrome.exe" delete'],
  // Parameter prefixes and aliases PowerShell accepts.
  ['PowerShell', 'kill -Name chrome'],
  ['PowerShell', 'kill -n chrome -Force'],
  ['PowerShell', 'spps -n node'],
  ['PowerShell', 'Stop-Process -N chrome'],
  ['PowerShell', 'Stop-Process -Nam node'],
  ['PowerShell', 'Stop-Process -Name:chrome'],
  ['PowerShell', 'taskkill /FI "IMAGENAME eq chrome.exe" /F'],
  ['Bash', 'taskkill //FI "IMAGENAME eq node.exe" //F'],
  // Looking the process up by name, then killing "by PID" in the same statement.
  ['PowerShell', 'Stop-Process -Id (Get-Process chrome).Id'],
  ['PowerShell', 'taskkill /PID (Get-Process chrome).Id /F'],
  ['PowerShell', 'Get-Process | Stop-Process'],
  ['PowerShell', 'Get-Process -Name chrome | Select -Expand Id | % { Stop-Process -Id $_ }'],
  ['PowerShell', '(Get-Process chrome).Kill()'],
  ['PowerShell', 'Get-Process | Where-Object Name -eq chrome | Stop-Process'],
  ['PowerShell', 'Get-CimInstance Win32_Process -Filter "Name=\'chrome.exe\'" | Invoke-CimMethod -MethodName Terminate'],
  ['PowerShell', '[Diagnostics.Process]::GetProcessesByName("chrome") | % { $_.Kill() }'],
  ['PowerShell', 'wmic process where "name like \'%chrome%\'" delete'],
  ['PowerShell', 'Stop-Process `\n  -Name chrome'],
  ['Bash', 'echo `pkill node`'],
  ['Bash', 'powershell -c "kill -Name chrome"'],
  ['PowerShell', 'ps chrome | Stop-Process'],
  ['PowerShell', 'ps x | kill'],
  ['PowerShell', 'ps -Name chrome | spps'],
  ['PowerShell', 'Get-CimInstance Win32_Process -Filter "Name=\'chrome.exe\'" | Remove-CimInstance'],
  ['Bash', "ps aux | grep node | awk '{print $2}' | xargs kill"],
  ['Bash', 'pgrep vite | xargs kill'],
  ['PowerShell', 'wmic process where "commandline like \'%vite%\'" delete'],
  ['Bash', 'taskkill //IM node.exe //F'],
  ['PowerShell', 'Stop-Process -Name $n'],
]
for (const [t, c] of BLOCK) chk('blocks: ' + c, blocks(run(t, c)))

const ALLOW = [
  ['PowerShell', 'taskkill /PID 12345 /T /F'],
  ['PowerShell', 'Stop-Process -Id 12345'],
  ['PowerShell', '$p = Start-Process node -PassThru; Stop-Process -Id $p.Id'],
  ['Bash', 'kill 12345'],
  ['PowerShell', 'Get-Process chrome | Select-Object Id, StartTime'],
  ['Bash', 'git log --oneline'],
  ['Bash', 'grep -rn "killall" docs/'],
  ['PowerShell', 'Get-Process -Name chrome'],
  ['PowerShell', 'Get-Process -Id 4321 | Stop-Process'],
  ['PowerShell', 'tasklist /FI "IMAGENAME eq chrome.exe"'],
  ['Bash', 'kill -9 $!'],
  ['Bash', 'kill -n 9 12345'],
  ['Bash', 'kill %1'],
  ['Bash', 'ps aux | grep node'],
  ['Bash', 'npx kill-port 5173'],
  ['PowerShell', 'Get-NetTCPConnection -LocalPort 5173 | Select-Object OwningProcess'],
  // Text that only names the forms, and two separate statements that inspect and then
  // kill by PID.
  ['PowerShell', 'Get-Process node; Stop-Process -Id 4567'],
  ['PowerShell', 'Get-Process node | Format-Table; Stop-Process -Id 4567'],
  ['Bash', 'git commit -m "do not use ps chrome | kill or taskkill /IM"'],
  ['Bash', 'echo "Get-Process and then kill"'],
  ['Bash', 'grep -rn "taskkill /IM" docs/'],
  ['Bash', 'kill -n TERM 1234'],
]
for (const [t, c] of ALLOW) chk('allows: ' + c, run(t, c).trim() === '')
chk('other tools are left alone', (() => { try { return execFileSync('node', [HOOK], { input: JSON.stringify({ tool_name: 'Read', tool_input: { command: 'taskkill /IM x' } }), encoding: 'utf8' }).trim() === '' } catch (_) { return false } })())

for (const raw of ['null', '[]', '', '{bad json']) {
  let out
  try { out = execFileSync('node', [HOOK], { input: raw, encoding: 'utf8' }); chk('payload ' + JSON.stringify(raw) + ' does not crash', out.trim() === '') }
  catch (e) { chk('payload ' + JSON.stringify(raw) + ' does not crash', false, String(e.stderr).slice(0, 80)) }
}

console.log('\n' + pass + ' OK, ' + fail + ' failed')
process.exit(fail ? 1 : 0)
