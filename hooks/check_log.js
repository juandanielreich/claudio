const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const os = require('os')

// Read stdin first (contains the user's prompt)
let inputData = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { inputData += chunk })
process.stdin.on('end', () => {
  let userPrompt = ''
  try {
    const parsed = JSON.parse(inputData)
    userPrompt = parsed.prompt || ''
  } catch (_) {}

  const projectPath = process.cwd()
  const logFile = path.join(projectPath, '_claude_log.md')

  if (!fs.existsSync(logFile)) {
    const out = {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `_claude_log.md does not exist in ${projectPath}. Create it following the structure in CLAUDE.md before responding to the user.`
      }
    }
    process.stdout.write(JSON.stringify(out))
    process.exit(0)
  }

  const hash = crypto.createHash('md5').update(projectPath).digest('hex')
  const stateFile = path.join(os.tmpdir(), `claude_session_${hash}.json`)

  // Read session state once
  let state = {}
  let stateChanged = false
  try {
    if (fs.existsSync(stateFile)) {
      state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
    }
  } catch (_) {}

  let messages = []

  // --- Urgency signals in the user's message ---
  // If the user uses these words, call the Impact Analyst BEFORE acting
  const URGENCY_KEYWORDS = [
    'critical', 'high priority', 'top priority',
    'must not fail', 'cannot fail', 'must not break',
    'urgent', 'urgently', 'crucial'
  ]
  const promptLower = userPrompt.toLowerCase()
  const hasUrgency = URGENCY_KEYWORDS.some(kw => promptLower.includes(kw))
  if (hasUrgency) {
    messages.push('⚠ User used an urgency signal ("critical", "urgent", "must not fail", etc.). BEFORE implementing any change: call the Impact Analyst. If the scope is architectural, also suggest the Architect.')
  }

  // --- Pending section checks in the log ---
  try {
    const logContent = fs.readFileSync(logFile, 'utf8')
    if (/^## PENDING IMPACT ANALYSIS/m.test(logContent)) {
      messages.push('Impact Analyst: there are pending items in the log (section ## PENDING IMPACT ANALYSIS).')
    }
    if (/^## PENDING DESIGN/m.test(logContent)) {
      messages.push('UX Designer: there are screens pending shape in the log (section ## PENDING DESIGN).')
    }
  } catch (_) {}

  // --- PRODUCT.md check — once per session ---
  if (!fs.existsSync(path.join(projectPath, 'PRODUCT.md')) && !state.productMdMentioned) {
    messages.push('PRODUCT.md does not exist in this project. Mention to the user once: "This project has no PRODUCT.md. Should we create it now (5 min with Architect Mode C) or later?" — don\'t repeat this session.')
    state.productMdMentioned = true
    stateChanged = true
  }

  // --- Accumulated session state + close reminders ---
  if ((state.editCount || 0) > 0) {
    const parts = []
    const shown = (state.filesEdited || []).slice(0, 4).join(', ')
    const extra = (state.filesEdited || []).length > 4 ? ` +${state.filesEdited.length - 4} more` : ''
    parts.push(`${state.editCount} edits in: ${shown}${extra}`)

    if (state.uiFilesEdited && state.uiFilesEdited.length > 0) {
      parts.push(`UI: ${state.uiFilesEdited.join(', ')}`)
    }
    if (state.deployRan) parts.push('deploy ran')
    else if (state.buildRan) parts.push('build ran')

    if (!state.gitCommitted) {
      parts.push('⚠ no git commit — verify before closing')
    }

    const productMdExists = fs.existsSync(path.join(projectPath, 'PRODUCT.md'))
    const closeSteps = productMdExists
      ? 'At session close: (1) check if PRODUCT.md needs updating. (2) Batched agent proposal before HISTORY. (3) Clear state: node ~/.claude/hooks/clear_session_state.js'
      : 'At session close: present batched agent proposal before writing HISTORY. Then clear state: node ~/.claude/hooks/clear_session_state.js'

    messages.push(`Session state: ${parts.join(' | ')}. ${closeSteps}`)
  }

  // --- Save state changes ---
  if (stateChanged) {
    try { fs.writeFileSync(stateFile, JSON.stringify(state), 'utf8') } catch (_) {}
  }

  if (messages.length > 0) {
    const out = {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: messages.join(' — ')
      }
    }
    process.stdout.write(JSON.stringify(out))
  }

  process.exit(0)
})
