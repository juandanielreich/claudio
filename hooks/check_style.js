// Enforces the mechanizable half of the anti-AI baseline on chat replies.
//
// Why: CLAUDE.md's anti-AI baseline is prose, and prose gets skipped. Four of its
// rules can be checked by a machine on the text of the reply itself, so they are
// checked here instead of trusted to the model: em dashes, curly quotes, hollow
// filler phrases, and an opening preamble instead of the conclusion. Two more come
// from the response-shape rules: one idea per bullet, and short paragraphs.
//
// What it does NOT check, and why: the rules about vocabulary density, inflated
// importance, negative parallelism, and vague attribution all need judgment about
// meaning. A regex for them would fire on legitimate prose, and a hook that cries
// wolf gets turned off. Those stay with the model.
//
// This is a Stop hook, so it runs after the reply is already on screen: the only
// remedy it has is asking for another version, and the user sees two near-identical
// answers. Keep that cost in mind before adding a rule here. A rule that fires on a
// large share of turns is not enforcement, it is duplicated messages. Measure how
// often a candidate rule would fire before adding it.

const fs = require('fs')

function check(textOnly) {
  let hit = null

  // 1. Em dash, banned in any position (CLAUDE.md "Formatting": zero em dashes).
  if (/—/.test(textOnly)) {
    hit = { rule: 'Formatting, zero em dashes', detail: 'the reply contains an em dash' }
  }

  // 2. Curly quotes, must be straight.
  if (!hit && /[“”‘’]/.test(textOnly)) {
    hit = { rule: 'Formatting, straight quotes', detail: 'the reply contains curly quotes' }
  }

  // 3. Hollow filler. The list is short and literal on purpose: tolerating a stray
  // case beats a check that is expensive or noisy.
  if (!hit) {
    const HOLLOW_PHRASES = [
      /it'?s worth noting that/i, /it is worth noting that/i,
      /in summary,/i, /in conclusion,/i, /furthermore,/i,
      /i'?m reaching out to/i, /please find attached/i,
      /i hope this (message|email) finds you well/i,
      /looking forward to your (reply|comments|thoughts)/i,
      /i hope this helps/i, /let me know if you (need|have) (anything|any)/i,
    ]
    for (const re of HOLLOW_PHRASES) {
      if (re.test(textOnly)) { hit = { rule: 'No hollow filler', detail: `matches /${re.source}/` }; break }
    }
  }

  // 4. Opening preamble. The reply must open with the conclusion, not with filler.
  if (!hit) {
    const firstLine = (textOnly.trim().split('\n')[0] || '').trim()
    if (/^(certainly|of course|sure|absolutely|great question|good question)[,.:!]/i.test(firstLine)) {
      hit = { rule: 'Conclusion first', detail: `first line is preamble: "${firstLine.slice(0, 40)}"` }
    }
  }

  const textLines = textOnly.split('\n')

  // 5. Bullet with 2+ sentences ("one idea per bullet, one line per bullet").
  // Conservative cut: a period only counts as a sentence break when an uppercase
  // letter follows, which keeps decimals and URLs out. Common abbreviations are
  // excluded too, so "Dr. Smith" is not a sentence break.
  if (!hit) {
    const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'eg', 'ie', 'fig', 'vol', 'no', 'approx', 'dept'])
    const bulletLines = textLines.filter(l => /^\s{0,3}[-*]\s+/.test(l))
    for (const line of bulletLines) {
      const body = line.replace(/^\s{0,3}[-*]\s+/, '')
      const sentenceBreak = [...body.matchAll(/(\p{L}+)[.!?]\s+[A-Z0-9]/gu)]
        .some(m => !ABBREVIATIONS.has(m[1].toLowerCase()))
      if (sentenceBreak) {
        hit = { rule: 'One idea per bullet', detail: `bullet with 2+ sentences: "${body.slice(0, 50)}"` }
        break
      }
    }
  }

  // 6. Long prose paragraph outside bullets, headings, tables and code: more than 45
  // words in a row without a break. Markdown table rows count as separators, not as
  // prose. Adjust the threshold if it turns out noisy.
  if (!hit) {
    const isSep = l => /^\s{0,3}([-*]|\d+[.)])\s+/.test(l) || /^#{1,6}\s/.test(l) || /^\s*\|/.test(l) || l.trim() === ''
    const blocks = textLines.map(l => isSep(l) ? '\x00' : l).join(' ').split('\x00')
    for (const block of blocks) {
      const wordCount = (block.match(/\S+/g) || []).length
      if (wordCount > 45) {
        hit = { rule: 'Short paragraphs', detail: `paragraph of ${wordCount} words with no bullets` }
        break
      }
    }
  }

  if (!hit) return null

  return `The previous reply breaks CLAUDE.md rule "${hit.rule}": ${hit.detail}. Rewrite it shorter, in one-line bullets, and answer again.`
}

// Walks the current turn from the end back to the last real user message and
// returns the assistant's last text block. tool_result entries carry role 'user'
// but do not end a turn, so they don't stop the walk. Same shape as
// check_decision_prose.js, kept separate so each hook stays self-contained.
function lastAssistantText(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return ''
  let lines
  try { lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean) } catch (_) { return '' }
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry
    try { entry = JSON.parse(lines[i]) } catch (_) { continue }
    const msg = entry.message
    if (!msg) continue
    const content = msg.content
    if (msg.role === 'user') {
      if (Array.isArray(content) && content.some(b => b.type === 'tool_result')) continue
      return ''
    }
    if (msg.role !== 'assistant' || !Array.isArray(content)) continue
    const text = content.filter(b => b.type === 'text').map(b => b.text).join('\n')
    if (text) return text
  }
  return ''
}

if (require.main === module) {
  let inputData = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', chunk => { inputData += chunk })
  process.stdin.on('end', () => {
    if (!inputData.trim()) process.exit(0)
    let json
    try { json = JSON.parse(inputData) } catch (_) { process.exit(0) }

    // Prevents an infinite loop: if this hook already blocked this Stop, let it through.
    if (json.stop_hook_active) process.exit(0)

    const text = lastAssistantText(json.transcript_path)
    if (!text) process.exit(0)

    // Code is exempt: an em dash inside a quoted snippet belongs to the source. Inline code
    // doesn't cross a newline, so a stray backtick can't swallow the lines below it.
    const textOnly = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')

    const reason = check(textOnly)
    if (!reason) process.exit(0)

    console.log(JSON.stringify({ decision: 'block', reason }))
    process.exit(0)
  })
}

module.exports = check
