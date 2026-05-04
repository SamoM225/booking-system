// Spustí BE aj FE na voľných portoch v rozsahu 3000-3100.
// Použitie: node scripts/dev.mjs [be|fe]  (bez argumentu spustí oboje)
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const MIN_PORT = 3000
const MAX_PORT = 3100
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function isFree(port) {
  return new Promise((resolve) => {
    const srv = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => srv.close(() => resolve(true)))
      .listen(port, '0.0.0.0')
  })
}

async function findFreePort(exclude = []) {
  for (let port = MIN_PORT; port <= MAX_PORT; port++) {
    if (!exclude.includes(port) && (await isFree(port))) return port
  }
  throw new Error(`Žiadny voľný port v rozsahu ${MIN_PORT}-${MAX_PORT}`)
}

function run(name, cwd, args, env) {
  const child = spawn('npm', ['run', ...args], {
    cwd: join(root, cwd),
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: true,
  })
  child.on('exit', (code) => {
    console.log(`[${name}] ukončený (kód ${code})`)
    process.exit(code ?? 0)
  })
  return child
}

const target = process.argv[2]
const bePort = await findFreePort()
const fePort = await findFreePort([bePort])
const beUrl = `http://localhost:${bePort}`

if (!target || target === 'be') {
  console.log(`[BE] ${beUrl}`)
  run('BE', 'backend', ['dev'], { PORT: String(bePort) })
}
if (!target || target === 'fe') {
  console.log(`[FE] http://localhost:${fePort}`)
  run('FE', 'frontend', ['dev', '--', '--port', String(fePort)], {
    PORT: String(fePort),
    NUXT_PORT: String(fePort),
    NUXT_PUBLIC_API_BASE: beUrl,
  })
}
