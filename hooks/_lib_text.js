// What counts as code, and is therefore exempt from the style rules.
//
// It lives here because two layers apply the CLAUDE.md rules: the Stop hooks
// (check_style.js, check_decision_prose.js), which read chat replies, and
// check_no_emdash.js, which reads the .md files being written. Adding a form of
// code here makes both layers recognize it at once: they used to carry their own
// copies, and the Stop hooks' regex missed ~~~ fences, fences inside list items,
// a backtick in the info string and unclosed fences.
//
// Forms it recognizes: backtick fences (```), tilde fences (~~~), indented code
// block lines (4+ spaces or a tab at the start) and inline spans (`code`). Fences
// are handled first so their indented content isn't mistaken for a loose indented
// block. The indented-line filter is a heuristic: a deeply indented prose line
// inside a nested list is also stripped, so an em dash there passes. That risk is
// accepted because indented code is more common than four-space-indented prose.
//
// `{ blocks: true }` (default) drops every code block and indented line. The Stop
// hooks use it.
//
// `{ blocks: false }` keeps block contents and strips only the fence lines and inline
// code. check_no_emdash.js uses it under skills/ and agents/, where a code block is the
// template the model copies on every use, not a quote.
//
// `{ blocks: 'tagged' }` exempts only blocks that declare a language (```js, ~~~text):
// a block with no language counts as your own text. check_no_emdash.js uses it for the
// rest of the .md files. Indented blocks stay exempt, since they can't declare a
// language.
//
// All three modes read fences with the same walk (`segments`) and differ only in what
// they keep. In all three, inline code never crosses a newline, so a stray backtick
// can't swallow the lines below it.
function stripCode(text, { blocks = true } = {}) {
  const indented = l => /^( {4,}|\t)/.test(l)
  const out = []
  for (const s of segments(String(text))) {
    if (s.prose !== undefined) {
      // Prose loses its indented lines, except under skills/ and agents/ (blocks: false),
      // where they were never exempt.
      if (blocks === false || !indented(s.prose)) out.push(s.prose)
    } else if (blocks === false || (blocks === 'tagged' && !s.info.trim())) {
      out.push(...s.lines)
    } else {
      // An empty line in place of the block: without it the prose before and after
      // would merge into one paragraph, and the Stop hooks measure paragraphs.
      out.push('')
    }
  }
  return out.join('\n').replace(/`[^`\n]*`/g, '')
}

// Opening: any indentation (inside a list item a fence sits at 4+ spaces, and the
// CommonMark cap of 3 left it exempt whole), 3 or more of the same character, and the
// rest is the info string. A backtick fence whose info string contains a backtick is
// not a fence (CommonMark) but inline code, as in "```a``` and more".
const OPENING = /^[ \t]*(`{3,}|~{3,})(.*)$/

// Splits the text, in order, into `{ prose: line }` and `{ info, lines }` (a closed block
// without its fence lines). It walks the lines instead of using a regex because the
// closing fence of a tagged block is a bare fence line that a regex would take as the
// opening of an untagged one.
function segments(text) {
  const lines = text.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const m = lines[i].replace(/\r$/, '').match(OPENING)
    if (!m || (m[1][0] === '`' && m[2].includes('`'))) { out.push({ prose: lines[i] }); i++; continue }
    const fence = m[1]
    const closing = new RegExp('^[ \\t]*' + (fence[0] === '`' ? '`' : '~') + '{' + fence.length + ',}[ \\t]*$')
    let j = i + 1
    while (j < lines.length && !closing.test(lines[j].replace(/\r$/, ''))) j++
    // An unclosed fence exempts nothing and doesn't swallow what follows: its line counts
    // as prose (without the fence marks) and the walk goes on, so a block further down
    // is still recognized.
    if (j >= lines.length) { out.push({ prose: m[2] }); i++; continue }
    out.push({ info: m[2], lines: lines.slice(i + 1, j) })
    i = j + 1
  }
  return out
}

module.exports = { stripCode }
