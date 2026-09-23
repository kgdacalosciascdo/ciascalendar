import { spawn } from 'node:child_process'

// Keep browser tests isolated from a developer's real .env.local project.
process.env.VITE_SUPABASE_URL = ''
process.env.VITE_SUPABASE_ANON_KEY = ''

const child = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174'],
  { stdio: 'inherit', env: process.env },
)

child.on('exit', (code) => process.exit(code ?? 1))
