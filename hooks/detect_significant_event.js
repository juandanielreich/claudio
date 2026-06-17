const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const os = require('os')

let inputData = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { inputData += chunk })
process.stdin.on('end', () => {
  if (!inputData.trim()) process.exit(0)

  let json
  try { json = JSON.parse(inputData) } catch (_) { process.exit(0) }

  const toolName = json.tool_name
  const toolInput = json.tool_input || {}

  const filePath = toolInput.file_path || ''
  const isLogFile = filePath.endsWith('_claude_log.md')

  const UI_EXTENSIONS = ['.jsx', '.tsx', '.html', '.css', '.vue', '.svelte']
  const ext = path.extname(filePath).toLowerCase()
  const isUIFile = UI_EXTENSIONS.includes(ext)
  const fileName = path.basename(filePath)

  let eventType = null

  if (!isLogFile && (toolName === 'Write' || toolName === 'Edit')) {
    eventType = isUIFile ? 'ui' : 'code'
  } else if (toolName === 'Bash' || toolName === 'PowerShell') {
    const cmd = toolInput.command || ''
    if (/wrangler\s+pages\s+deploy|railway\s+up/.test(cmd)) {
      eventType = 'deploy'
    } else if (/(npm|yarn|pnpm)\s+run\s+build|vite\s+build|next\s+build|nuxt\s+build/.test(cmd)) {
      eventType = 'build'
    } else if (/git\s+(commit|push)/.test(cmd)) {
      eventType = 'git_commit'
    }
  }

  if (!eventType) process.exit(0)

  const projectPath = process.cwd()
  const hash = crypto.createHash('md5').update(projectPath).digest('hex')
  const stateFile = path.join(os.tmpdir(), `claude_session_${hash}.json`)

  let state = { editCount: 0, filesEdited: [], uiFilesEdited: [], buildRan: false, deployRan: false }
  try {
    if (fs.existsSync(stateFile)) {
      const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
      state = { ...state, ...saved }
    }
  } catch (_) {}

  if (eventType === 'ui') {
    state.editCount = (state.editCount || 0) + 1
    if (!state.filesEdited.includes(fileName)) state.filesEdited.push(fileName)
    if (!state.uiFilesEdited.includes(fileName)) state.uiFilesEdited.push(fileName)
  } else if (eventType === 'code') {
    state.editCount = (state.editCount || 0) + 1
    if (!state.filesEdited.includes(fileName)) state.filesEdited.push(fileName)
  } else if (eventType === 'build') {
    state.buildRan = true
  } else if (eventType === 'deploy') {
    state.buildRan = true
    state.deployRan = true
  } else if (eventType === 'git_commit') {
    state.gitCommitted = true
  }

  try { fs.writeFileSync(stateFile, JSON.stringify(state), 'utf8') } catch (_) {}

  process.exit(0)
})
