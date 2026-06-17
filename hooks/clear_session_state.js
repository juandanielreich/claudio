const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const os = require('os')

const projectPath = process.cwd()
const hash = crypto.createHash('md5').update(projectPath).digest('hex')
const stateFile = path.join(os.tmpdir(), `claude_session_${hash}.json`)

if (fs.existsSync(stateFile)) {
  fs.unlinkSync(stateFile)
  console.log('Session state cleared.')
} else {
  console.log('No active session state.')
}
