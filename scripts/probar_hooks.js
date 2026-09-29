// Test suite for the write-side hooks (check_escritura.js and the two checks it
// dispatches: check_hardcoded_paths.js and check_no_emdash.js).
//
// Each case is piped end-to-end through check_escritura.js, exactly as Claude Code
// runs it in production: a JSON payload on stdin, and a block decision (or nothing)
// on stdout. That way the suite exercises the dispatcher's resilience too, not just
// the checks in isolation.
//
// Note on the fixtures: a suite that tests a hardcoded-path detector has to feed it
// real paths, but if those paths appeared as literals in THIS source file, the very
// same PreToolUse hook (running on the author's machine) would block the write of
// the test. So every fixture path is built from fragments at runtime (winUser and
// friends): the string reaching the hook-under-test is a real path, while this
// file's source never contains a contiguous one. The em dash gets the same treatment
// via the EM escape.
//
// Cases that depend on the destination file already existing on disk create a temp
// file first, under a per-run unique directory so two runs never collide.
//
// Run: node scripts/probar_hooks.js  (exit code non-zero if any case fails)

const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const HOOK = path.join(__dirname, '..', 'hooks', 'check_escritura.js')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'claudio-hooktest-'))

const EM = '\u2014'                 // em dash, escaped so this file has none of its own
const B = String.fromCharCode(92)   // backslash, so no ":\Users\" literal appears here
const S = '/'
const winUser = n => 'C:' + B + 'Users' + B + n + B + 'x'
const winUserFwd = n => 'C:' + S + 'Users' + S + n + S + 'x'
const homeUser = n => S + 'home' + S + n + S + 'x'
const macUser = n => S + 'Users' + S + n + S + 'x'

function run(payload, hook = HOOK) {
  const res = spawnSync('node', [hook], { input: JSON.stringify(payload), encoding: 'utf8' })
  const out = (res.stdout || '').trim()
  if (!out) return { blocked: false, reason: '' }
  try {
    const j = JSON.parse(out)
    return { blocked: j.decision === 'block', reason: j.reason || '' }
  } catch (_) {
    return { blocked: false, reason: '', malformed: out }
  }
}

function write(name, content) {
  const p = path.join(TMP, name)
  fs.writeFileSync(p, content)
  return p
}

const cases = []
function c(name, payload, expect, check, hook) { cases.push({ name, payload, expect, check, hook }) }

// Stop hooks read the last assistant reply from the transcript, so each case writes a
// one-line transcript and points the payload at it.
let nTranscript = 0
function stop(hookFile, name, text, expect) {
  const t = write('transcript-' + (++nTranscript) + '.jsonl',
    JSON.stringify({ message: { role: 'assistant', content: [{ type: 'text', text }] } }) + '\n')
  c(name, { transcript_path: t }, expect, hookFile.replace(/\.js$/, ''), path.join(__dirname, '..', 'hooks', hookFile))
}

// ---- check_hardcoded_paths ----
c('hardcoded path in .js', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.js', content: 'const p = "' + winUser('someone') + '"' } }, 'block', 'paths')
c('hardcoded path on a comment line (skipped by design)', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.js', content: '// path is ' + winUser('someone') } }, 'pass', 'paths')
c('linux /home path', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.sh', content: 'cd ' + homeUser('someone') } }, 'block', 'paths')
c('mac /Users path', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.py', content: 'p = "' + macUser('someone') + '"' } }, 'block', 'paths')
c('forward-slash windows path C:/Users', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.js', content: 'const p = "' + winUserFwd('someone') + '"' } }, 'block', 'paths')
c('.jsonc extension (added in the port)', { tool_name: 'Write', tool_input: { file_path: '/tmp/opencode.jsonc', content: '{ "p": "' + winUser('someone') + '" }' } }, 'block', 'paths')
c('path under dist/ (excluded)', { tool_name: 'Write', tool_input: { file_path: '/tmp/dist/a.js', content: 'const p = "' + winUser('someone') + '"' } }, 'pass', 'paths')
c('.env file with path', { tool_name: 'Write', tool_input: { file_path: '/tmp/.env.local', content: 'HOME_DIR=' + winUser('someone') } }, 'block', 'paths')
c('clean .js, no path', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.js', content: 'const p = process.env.HOME' } }, 'pass', 'paths')
c('non-checked extension .txt with path', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.txt', content: winUser('someone') } }, 'pass', 'paths')
c('Edit new_string with path', { tool_name: 'Edit', tool_input: { file_path: '/tmp/a.js', old_string: 'x', new_string: 'const p = "' + winUser('someone') + '"' } }, 'block', 'paths')

// ---- check_no_emdash ----
c('em dash in new .md', { tool_name: 'Write', tool_input: { file_path: '/tmp/n1.md', content: 'text ' + EM + ' dash' } }, 'block', 'emdash')
c('clean new .md', { tool_name: 'Write', tool_input: { file_path: '/tmp/n2.md', content: 'text without anything' } }, 'pass', 'emdash')
c('em dash inside a fenced code block with no language (counts)', { tool_name: 'Write', tool_input: { file_path: '/tmp/n3.md', content: 'prose\n```\ncode ' + EM + ' here\n```\n' } }, 'block', 'emdash')
c('em dash inside a fenced code block with a language (ignored)', { tool_name: 'Write', tool_input: { file_path: '/tmp/n3b.md', content: 'prose\n```text\ncode ' + EM + ' here\n```\n' } }, 'pass', 'emdash')
c('tagged block, then an untagged one with an em dash (the closing fence is not an opening)', { tool_name: 'Write', tool_input: { file_path: '/tmp/n3c.md', content: '```js\nconst a = 1\n```\nprose\n```\nHeader ' + EM + ' here\n```\n' } }, 'block', 'emdash')
c('em dash only inside the tagged block, untagged one clean', { tool_name: 'Write', tool_input: { file_path: '/tmp/n3d.md', content: '```js\nconst a = "' + EM + '"\n```\nprose\n```\nclean\n```\n' } }, 'pass', 'emdash')
c('em dash inside an unclosed tagged fence (counts)', { tool_name: 'Write', tool_input: { file_path: '/tmp/n3e.md', content: '```js\ncode ' + EM + ' here\n' } }, 'block', 'emdash')
c('untagged fence inside a list item indented 4 spaces (counts)', { tool_name: 'Write', tool_input: { file_path: '/tmp/n3f.md', content: '- item\n\n    ```\n    Header ' + EM + ' here\n    ```\n' } }, 'block', 'emdash')
c('inline code with three backticks is not a fence opening', { tool_name: 'Write', tool_input: { file_path: '/tmp/n3g.md', content: '```a``` and then ' + EM + ' in prose\n' } }, 'block', 'emdash')
c('an unclosed fence does not swallow the untagged block below', { tool_name: 'Write', tool_input: { file_path: '/tmp/n3h.md', content: '````js\nunclosed\n```\nHeader ' + EM + ' here\n```\n' } }, 'block', 'emdash')
c('em dash inside a code block under skills/ (a template, counts)', { tool_name: 'Write', tool_input: { file_path: '/tmp/skills/x/SKILL.md', content: 'prose\n```\nHeader ' + EM + ' here\n```\n' } }, 'block', 'emdash')
c('em dash inside a code block under agents/ (a template, counts)', { tool_name: 'Write', tool_input: { file_path: '/tmp/agents/qa.md', content: 'prose\n```\nQA ' + EM + ' [Project]\n```\n' } }, 'block', 'emdash')
c('em dash inside inline code under skills/ (still ignored)', { tool_name: 'Write', tool_input: { file_path: '/tmp/skills/x/SKILL.md', content: 'zero em dashes (`' + EM + '`) anywhere' } }, 'pass', 'emdash')
c('em dash after three-backtick inline code under skills/ (not a fence, counts)', { tool_name: 'Write', tool_input: { file_path: '/tmp/skills/x/SKILL.md', content: '```a``` and more ' + EM + ' here\n' } }, 'block', 'emdash')
c('em dash inside inline code span', { tool_name: 'Write', tool_input: { file_path: '/tmp/n4.md', content: 'prose `a ' + EM + ' b` more' } }, 'pass', 'emdash')
c('em dash in prose AND in code (prose one counts)', { tool_name: 'Write', tool_input: { file_path: '/tmp/n5.md', content: 'real ' + EM + ' one\n```\ncode ' + EM + '\n```' } }, 'block', 'emdash')
c('Edit removes an em dash (old 1, new 0)', { tool_name: 'Edit', tool_input: { file_path: '/tmp/x.md', old_string: 'a ' + EM + ' b', new_string: 'a, b' } }, 'pass', 'emdash')
c('Edit keeps one em dash (old 1, new 1) not retroactive', { tool_name: 'Edit', tool_input: { file_path: '/tmp/x.md', old_string: 'a ' + EM + ' b', new_string: 'a ' + EM + ' b changed' } }, 'pass', 'emdash')
c('Edit adds an em dash to existing (old 1, new 2)', { tool_name: 'Edit', tool_input: { file_path: '/tmp/x.md', old_string: 'a ' + EM + ' b', new_string: 'a ' + EM + ' b ' + EM + ' c' } }, 'block', 'emdash')
c('em dash in .md under node_modules (excluded)', { tool_name: 'Write', tool_input: { file_path: '/tmp/node_modules/x.md', content: 'text ' + EM + ' dash' } }, 'pass', 'emdash')
c('file_path is not a string (must not throw)', { tool_name: 'Write', tool_input: { file_path: 12345, content: 'text ' + EM + ' dash' } }, 'pass', 'emdash')

// ---- fs-dependent: Edit is counted over the whole file ----
{
  const withText = write('exists-with-text-block.md', 'prose\n\n```text\nline one\n```\n')
  c('Edit adding an em dash inside an existing ```text block passes', { tool_name: 'Edit', tool_input: { file_path: withText, old_string: 'line one', new_string: 'line one ' + EM + ' quoted' } }, 'pass', 'emdash')
  c('Edit adding an em dash to the prose of the same file blocks', { tool_name: 'Edit', tool_input: { file_path: withText, old_string: 'prose', new_string: 'prose ' + EM + ' own' } }, 'block', 'emdash')
}

// ---- fs-dependent: Write over an existing .md ----
{
  const withEm = write('exists-with-em.md', 'heading\na ' + EM + ' b\n')
  c('Write over existing .md that already had an em dash, content preserves it', { tool_name: 'Write', tool_input: { file_path: withEm, content: 'heading\na ' + EM + ' b\nnew clean line' } }, 'pass', 'emdash')
  c('Write over existing .md, content ADDS a second em dash', { tool_name: 'Write', tool_input: { file_path: withEm, content: 'heading\na ' + EM + ' b ' + EM + ' c' } }, 'block', 'emdash')
  const clean = write('exists-clean.md', 'heading\nno dashes here\n')
  c('Write over existing clean .md, content adds an em dash', { tool_name: 'Write', tool_input: { file_path: clean, content: 'heading\nnow with ' + EM + ' dash' } }, 'block', 'emdash')
}

// ---- edge cases the four false-positive fixes address ----
c('C:\\Users\\Public system folder (not a username) passes', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.js', content: 'const p = "' + 'C:' + B + 'Users' + B + 'Public' + B + 'app"' } }, 'pass', 'paths')
c('C:\\Users\\Default system folder passes', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.js', content: 'const p = "' + 'C:' + B + 'Users' + B + 'Default' + B + 'x"' } }, 'pass', 'paths')
c('path in a trailing comment passes', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.js', content: 'const x = 1 // see ' + winUser('someone') } }, 'pass', 'paths')
c('em dash inside a tilde ~~~ fence with no language counts', { tool_name: 'Write', tool_input: { file_path: '/tmp/nt.md', content: 'prose\n~~~\ncode ' + EM + ' here\n~~~\n' } }, 'block', 'emdash')
c('em dash inside a tilde ~~~text fence passes', { tool_name: 'Write', tool_input: { file_path: '/tmp/ntb.md', content: 'prose\n~~~text\ncode ' + EM + ' here\n~~~\n' } }, 'pass', 'emdash')
c('em dash inside a 4-space indented code block passes', { tool_name: 'Write', tool_input: { file_path: '/tmp/ni.md', content: 'prose\n\n    code ' + EM + ' here\n' } }, 'pass', 'emdash')

// ---- Stop hooks: which forms count as code (_lib_text.js, shared with check_no_emdash) ----
stop('check_style.js', 'Stop: em dash in plain prose blocks (control)', 'Some prose ' + EM + ' here.', 'block')
stop('check_style.js', 'Stop: em dash inside a ~~~ fence passes', 'Prose.\n\n~~~\nquoted ' + EM + ' source\n~~~\n\nMore prose.', 'pass')
stop('check_style.js', 'Stop: em dash inside a fence indented in a list item passes', '- item\n\n    ```\n    quoted ' + EM + ' source\n    ```\n', 'pass')
stop('check_style.js', 'Stop: an unclosed fence exempts nothing', 'Prose.\n```\nstill prose ' + EM + ' here', 'block')
stop('check_style.js', 'Stop: inline "```a``` and more" is not a fence, the em dash below still counts', 'See ```a``` and more.\n\nThen ' + EM + ' this.\n\n```\nx\n```', 'block')
stop('check_style.js', 'Stop: em dash inside a 4-space indented code block passes', 'Prose.\n\n    quoted ' + EM + ' source\n\nMore prose.', 'pass')
stop('check_style.js', 'Stop: a triple backtick mid-line does not pair with the next fence', 'Type ``` to open a fence.\n\nProse ' + EM + ' here.\n\n```\ncode\n```', 'block')
stop('check_decision_prose.js', 'Stop: a lettered options menu in prose blocks (control)', 'Which one?\n\n[A] first\n[B] second', 'block')
stop('check_decision_prose.js', 'Stop: a lettered options menu inside a ~~~ fence passes', 'Here is the template?\n\n~~~\n[A] first\n[B] second\n~~~', 'pass')

// ---- dispatcher resilience / general ----
// An update that copies the hooks but forgets a new shared lib: the em-dash check can't
// load, and the path check must keep blocking instead of dying with it.
const NOLIB = path.join(TMP, 'hooks-without-lib')
fs.mkdirSync(NOLIB)
for (const f of fs.readdirSync(path.join(__dirname, '..', 'hooks'))) {
  if (f.endsWith('.js') && f !== '_lib_text.js') fs.copyFileSync(path.join(__dirname, '..', 'hooks', f), path.join(NOLIB, f))
}
c('missing _lib_text.js: the path check still blocks', { tool_name: 'Write', tool_input: { file_path: '/tmp/nolib.js', content: 'const p = "' + winUser('someone') + '"' } }, 'block', 'dispatcher', path.join(NOLIB, 'check_escritura.js'))

c('empty payload -> pass', {}, 'pass', 'dispatcher')
c('no tool_name -> pass', { tool_input: { file_path: '/tmp/a.js', content: 'x' } }, 'pass', 'dispatcher')
c('Read tool (not a write) -> pass', { tool_name: 'Read', tool_input: { file_path: '/tmp/a.md' } }, 'pass', 'dispatcher')

// ---- run ----
let pass = 0, fail = 0
const failures = []
const evidence = []
for (const t of cases) {
  const r = run(t.payload, t.hook)
  const got = r.blocked ? 'block' : 'pass'
  const ok = got === t.expect
  if (ok) pass++; else { fail++; failures.push({ ...t, got, reason: r.reason, malformed: r.malformed }) }
  evidence.push({ name: t.name, check: t.check, expect: t.expect, got, ok, reason: r.reason ? r.reason.slice(0, 120) : '', malformed: r.malformed || null })
}

const stamp = new Date().toISOString()
const evidenceDir = path.join(__dirname, '..', 'evidence')
fs.mkdirSync(evidenceDir, { recursive: true })
const evidenceFile = path.join(evidenceDir, 'probar_hooks-latest.json')
fs.writeFileSync(evidenceFile, JSON.stringify({ stamp, total: cases.length, pass, fail, cases: evidence }, null, 2))

console.log('\nHook test suite: ' + pass + '/' + cases.length + ' passed, ' + fail + ' failed')
if (fail > 0) {
  console.log('\nFAILURES:')
  for (const f of failures) {
    console.log('  [' + f.check + '] ' + f.name)
    console.log('      expected ' + f.expect + ', got ' + f.got + (f.malformed ? ' (MALFORMED: ' + f.malformed.slice(0, 80) + ')' : ''))
  }
}
console.log('\nEvidence: ' + path.relative(path.join(__dirname, '..'), evidenceFile))

try { fs.rmSync(TMP, { recursive: true, force: true }) } catch (_) {}
process.exit(fail > 0 ? 1 : 0)
