// Blocks the em dash (U+2014) when writing any .md file.
//
// Why: the "Formatting: zero em dashes" rule of CLAUDE.md lives in prose and in
// check_style.js, which only looks at chat replies. That left .md files with no
// mechanical control, so the em dash kept reappearing in documentation, caught
// each time only at QA review, sometimes the same day it had been fixed.
//
// It counts a delta, not presence: it blocks only if the write ADDS em dashes. An
// edit that preserves a pre-existing em dash passes, because the rule is not
// retroactive ("em dashes already written get fixed when that line is edited for
// another reason"). An edit that keeps one and adds another does not pass, which
// is why it counts instead of comparing presence.
//
// Code is ignored, same as in check_style.js: an em dash that genuinely belongs to
// a quoted source goes inside backticks or a code block that declares a language
// (```text). A code block with no language counts as your own text (see
// stripTaggedCode below), and under skills/ and agents/ every code block counts (see
// TEMPLATES below).
const fs = require('fs')
const path = require('path')

const EM_DASH = /—/g
const count = s => (s.match(EM_DASH) || []).length

// Strips code so an em dash inside it isn't counted. Recognizes, in order: backtick
// fences (```), tilde fences (~~~), indented code block lines (4+ spaces or a tab),
// and inline `code` spans. Fences are removed first so their indented content isn't
// mistaken for a stray indented block. The indented-line filter is a heuristic: a
// deeply indented prose line inside a nested list is also stripped, so an em dash
// there would pass without blocking — an accepted trade-off, since indented code is
// more common than four-space-indented prose.
function stripCode(text) {
  return String(text)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .split('\n').filter(l => !/^( {4,}|\t)/.test(l)).join('\n')
    .replace(/`[^`]*`/g, '')
}

// Under skills/ and agents/ a code block is not a quote: it's the template the model
// copies on every use (a report header, an email skeleton). That is exactly how em
// dashes kept leaking into generated output. There, code blocks count; only inline
// `code` is ignored, which is where a rule names the character itself (`—`).
const TEMPLATES = /[\\/](skills|agents)[\\/]/i
function stripInlineCode(text) {
  return String(text)
    .replace(/^\s*(```|~~~).*$/gm, '')
    .replace(/`[^`\n]*`/g, '')
}

// Everywhere else, only code blocks that declare a language (```js, ~~~text) are
// ignored. A block with no language counts: measured over a real corpus, nearly every
// untagged block with an em dash was a template or the author's own text (file trees,
// schemas), not a quote. It walks the lines instead of using a regex because the
// closing fence of a tagged block is a bare fence line that a regex would take as the
// opening of an untagged one. Indented code blocks stay exempt, since they can't
// declare a language.
// A fence may be indented any amount (inside a list item it sits at 4+ spaces, and the
// CommonMark cap of 3 left it exempt). A backtick fence whose info string contains a
// backtick is not a fence but inline code ("```a``` and more"). An unclosed fence
// exempts nothing and doesn't swallow what follows: its line counts as prose and the
// walk goes on, so an untagged block further down is still recognized.
const OPENING = /^[ \t]*(`{3,}|~{3,})(.*)$/
function stripTaggedCode(text) {
  const lines = String(text).split('\n')
  const prose = []
  const untagged = []
  let i = 0
  while (i < lines.length) {
    const m = lines[i].replace(/\r$/, '').match(OPENING)
    if (!m || (m[1][0] === '`' && m[2].includes('`'))) { prose.push(lines[i]); i++; continue }
    const fence = m[1]
    const closing = new RegExp('^[ \\t]*' + (fence[0] === '`' ? '`' : '~') + '{' + fence.length + ',}[ \\t]*$')
    let j = i + 1
    while (j < lines.length && !closing.test(lines[j].replace(/\r$/, ''))) j++
    if (j >= lines.length) { prose.push(m[2]); i++; continue }
    if (!m[2].trim()) untagged.push(...lines.slice(i + 1, j))
    i = j + 1
  }
  // Prose has no fences left: indented-line filter plus inline code that doesn't cross
  // newlines, so a stray backtick can't swallow the lines below it.
  const cleanProse = prose.filter(l => !/^( {4,}|\t)/.test(l)).join('\n').replace(/`[^`\n]*`/g, '')
  return cleanProse + '\n' + untagged.join('\n').replace(/`[^`\n]*`/g, '')
}

// Returns { reason } if the write should be blocked, or null. Never exits.
// `raw` is the unparsed payload: with no em dash anywhere in it there is no
// possible positive delta, so we skip the readFileSync of the destination file.
function check(json, raw) {
  if (raw && !raw.includes('\\u2014') && !raw.includes('—')) return null

  const toolName = json.tool_name
  if (toolName !== 'Write' && toolName !== 'Edit') return null

  const toolInput = json.tool_input || {}
  // String() and not `|| ''`: a file_path that isn't a string makes path.extname
  // throw a TypeError, and a hook that throws takes the whole turn down with it.
  const filePath = String(toolInput.file_path || '')
  if (path.extname(filePath).toLowerCase() !== '.md') return null
  if (/[\\/](node_modules|\.git|dist|build|\.next)[\\/]/.test(filePath)) return null

  const isTemplate = TEMPLATES.test(filePath)
  const strip = isTemplate ? stripInlineCode : stripTaggedCode
  let before, after
  if (toolName === 'Write') {
    // New file: every em dash is new. Existing file: compare against what's
    // already on disk, or a maintenance Write over an old .md with inherited em
    // dashes would be blocked without having added any.
    let previous = ''
    try { previous = fs.readFileSync(filePath, 'utf8') } catch (_) { previous = '' }
    before = count(strip(previous))
    after = count(strip(toolInput.content || ''))
  } else {
    // Over the whole file with the replacement applied, not over the loose fragments: a
    // fragment doesn't know which block it falls in, so a line with an em dash added
    // inside an existing ```text block was blocked, with the very exit this message
    // recommends. If the file can't be read or old_string isn't in it, fall back to the
    // fragments (Claude Code will reject that edit anyway).
    const oldS = toolInput.old_string || ''
    const newS = toolInput.new_string || ''
    let previous = null
    try { previous = fs.readFileSync(filePath, 'utf8') } catch (_) { previous = null }
    // old_string arrives with LF even when the file has CRLF.
    if (previous !== null && !previous.includes(oldS)) previous = previous.replace(/\r\n/g, '\n')
    if (previous !== null && oldS && previous.includes(oldS)) {
      const next = toolInput.replace_all ? previous.split(oldS).join(newS) : previous.replace(oldS, () => newS)
      before = count(strip(previous))
      after = count(strip(next))
    } else {
      before = count(strip(oldS))
      after = count(strip(newS))
    }
  }

  if (after <= before) return null

  const added = after - before
  return {
    reason: `Em dash (—) in ${path.basename(filePath)}: this write adds ${added}. "Formatting: zero em dashes" rule of CLAUDE.md, in any position and in any prose I write, .md files included. Replace with a comma, period, or parentheses mid-sentence, and with a colon in a definition (**Term**: description). If the em dash is literal from a source being quoted, ` + (isTemplate
      ? 'put it inside inline backticks. Under skills/ and agents/ code blocks DO count: they are templates the model copies.'
      : 'put it inside backticks or a code block that declares a language (```text), which this check ignores. A code block with no language counts.')
  }
}

module.exports = check
