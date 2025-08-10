#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const rootEnvPath = path.join(repoRoot, '.env')
const frontendDir = path.join(repoRoot, 'frontend')
const feEnvPath = path.join(frontendDir, '.env.local')

function parseEnv(content) {
  const map = {}
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*['"]?([^'"\n]+)['"]?\s*$/)
    if (m) map[m[1]] = m[2]
  }
  return map
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8') } catch { return '' }
}

const rootEnv = parseEnv(read(rootEnvPath))
if (!rootEnv.CANISTER_ID_POLLS_SURVEYS_BACKEND) {
  console.error('CANISTER_ID_POLLS_SURVEYS_BACKEND not found in .env. Run `dfx deploy` first.')
  process.exit(1)
}
const canisterId = rootEnv.CANISTER_ID_POLLS_SURVEYS_BACKEND
const dfxNetwork = rootEnv.DFX_NETWORK || 'local'

let feEnv = read(feEnvPath)
const lines = feEnv ? feEnv.split(/\r?\n/) : []
const setKV = (k, v) => {
  const idx = lines.findIndex(l => l.startsWith(k + '='))
  const line = `${k}=${v}`
  if (idx >= 0) lines[idx] = line; else lines.push(line)
}
setKV('POLLS_SURVEYS_BACKEND_CANISTER_ID', canisterId)
setKV('NEXT_PUBLIC_POLLS_SURVEYS_BACKEND_CANISTER_ID', canisterId)
setKV('DFX_NETWORK', dfxNetwork)
setKV('NEXT_PUBLIC_DFX_NETWORK', dfxNetwork)

const out = lines.filter(Boolean).join('\n') + '\n'
fs.writeFileSync(feEnvPath, out)
console.log('Synced frontend/.env.local with canister id', canisterId, 'and network', dfxNetwork)
