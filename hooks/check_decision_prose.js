const fs = require('fs')

let inputData = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { inputData += chunk })
process.stdin.on('end', () => {
  if (!inputData.trim()) process.exit(0)

  let json
  try { json = JSON.parse(inputData) } catch (_) { process.exit(0) }

  // Prevents an infinite loop: if this hook already blocked this Stop, let it through.
  if (json.stop_hook_active) process.exit(0)

  const transcriptPath = json.transcript_path
  if (!transcriptPath || !fs.existsSync(transcriptPath)) process.exit(0)

  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean)

  // Walk the current turn: from the end back to the last real user message.
  // tool_result entries carry role 'user' but do not end a turn, so they don't stop the walk.
  let lastText = ''
  let usedAskUserQuestion = false
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry
    try { entry = JSON.parse(lines[i]) } catch (_) { continue }
    const msg = entry.message
    if (!msg) continue
    const content = msg.content

    if (msg.role === 'user') {
      const isToolResult = Array.isArray(content) && content.some(b => b.type === 'tool_result')
      if (isToolResult) continue
      break
    }

    if (msg.role !== 'assistant' || !Array.isArray(content)) continue

    if (content.some(b => b.type === 'tool_use' && b.name === 'AskUserQuestion')) {
      usedAskUserQuestion = true
      break
    }

    if (!lastText) {
      lastText = content.filter(b => b.type === 'text').map(b => b.text).join('\n')
    }
  }

  if (usedAskUserQuestion || !lastText) process.exit(0)

  // Strip code blocks and inline code: a list of options inside an example
  // is not a decision being handed to the user.
  const textOnly = lastText.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')

  // No question, no decision. Cheap filter that exits the common case before
  // any structural regex runs.
  if (!textOnly.includes('?')) process.exit(0)

  // Deliberately literal patterns: they catch the unmistakable shape of an
  // "options menu in prose", not every question.
  // Numbered lists (1./2.) are left OUT on purpose: they collide with summaries
  // and next-step lists that happen to end in a question — a false-positive
  // machine, which is the failure this hook must avoid to stay trustworthy.
  const PATTERNS = [
    {
      // [A] ... [B] — explicit option markers.
      test: t => (t.match(/\[[A-Z]\]/g) || []).length >= 2,
      name: 'lettered options ([A]/[B])'
    },
    {
      // "Option 1" / "Option 2".
      test: t => (t.match(/option\s+\d/gi) || []).length >= 2,
      name: 'numbered options ("Option 1", "Option 2")'
    },
    {
      // A question offering alternatives: "... X or Y?".
      // English has no opening question mark, so split into sentences first and
      // check the ones that actually end in '?'.
      test: t => t
        .split(/(?<=[.!?])\s+|\n/)
        .filter(s => s.trim().endsWith('?'))
        .some(s => /\s+or\s+/i.test(s)),
      name: 'a question offering alternatives ("X or Y?")'
    }
  ]

  const hit = PATTERNS.find(p => p.test(textOnly))
  if (!hit) process.exit(0)

  const output = {
    decision: 'block',
    reason: `The response offers a decision in prose (${hit.name}) without calling AskUserQuestion. CLAUDE.md rule: any decision that requires the user to choose goes through AskUserQuestion, never through prose — prose buries the choice under the argument. Respond again, passing the choice through the tool. If this was not a decision (a rhetorical question, a quote, an example), rephrase it without the options shape.`
  }
  console.log(JSON.stringify(output))
  process.exit(0)
})
