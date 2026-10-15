// `npm run dev -- [folder]`: the web client with hot reload plus the API, over a
// real folder on disk (the fixture docs by default).
import path from 'node:path'
import { createServer } from 'vite'

const packageRoot = path.resolve(import.meta.dirname, '..')
// npm runs scripts from the package root; INIT_CWD is where `npm run dev` was typed.
const cwd = process.env.INIT_CWD ?? process.cwd()
const arg = process.argv[2]

process.env.MDIFIT_DEV_TARGET = arg
  ? path.resolve(cwd, arg)
  : path.join(packageRoot, 'fixtures/docs')
process.env.MDIFIT_DEV_CWD = arg ? cwd : packageRoot

const server = await createServer({ configFile: path.join(packageRoot, 'vite.config.ts') })
await server.listen()
server.printUrls()
console.log(`  ➜  Docs:    ${process.env.MDIFIT_DEV_TARGET}\n`)
