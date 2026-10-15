#!/usr/bin/env node
import path from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from '../server/app.ts'
import { AppError } from '../server/lib/errors.ts'
import { listFiles, resolveWorkspace } from '../server/modules/workspace/workspace.ts'
import { HELP, parseCliArgs } from './args.ts'
import { probePort } from './instance.ts'
import { planStart } from './instance.rules.ts'
import { openBrowser, packageRoot, packageVersion } from './system.ts'

async function main(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv)
  if (parsed.kind === 'help') return print(HELP)
  if (parsed.kind === 'version') return print(packageVersion())
  if (parsed.kind === 'error') return fail(`${parsed.message}\n\n${HELP}`)

  const { target, port, open } = parsed.options
  const config = await resolveWorkspace(target, process.cwd())
  const url = `http://localhost:${port}`

  const plan = planStart(await probePort(port), config.target, port)
  if (plan.kind === 'conflict') return fail(plan.message)
  if (plan.kind === 'reuse') {
    console.log(`mdifit is already open for this folder: ${url}`)
    if (open) openBrowser(url)
    return 0
  }

  const version = packageVersion()
  const clientDir = path.join(packageRoot(), 'dist', 'client')
  const { app, close } = createApp({ config, version, clientDir })
  const fileCount = (await listFiles(config)).length

  const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
    const shown = path.relative(process.cwd(), config.target) || '.'
    console.log(
      [
        '',
        `  mdifit v${version}`,
        '',
        `  ➜  ${url}`,
        `  ➜  ${shown}  (${fileCount} Markdown ${fileCount === 1 ? 'file' : 'files'})`,
        '  ➜  Watching for changes · Ctrl+C to stop',
        '',
      ].join('\n'),
    )
    if (open) openBrowser(url)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    close()
    process.exitCode = fail(
      error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Pass --port.` : error.message,
    )
  })

  const stop = () => {
    close()
    server.close(() => process.exit(0))
    // Open event streams can hold the server; do not wait for them forever.
    setTimeout(() => process.exit(0), 500).unref()
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  return 0
}

function print(text: string): number {
  console.log(text.trimEnd())
  return 0
}

function fail(message: string): number {
  console.error(`mdifit: ${message.trimEnd()}`)
  return 1
}

main(process.argv.slice(2)).then(
  (code) => {
    if (code !== 0) process.exitCode = code
  },
  (error: unknown) => {
    process.exitCode = fail(error instanceof AppError ? error.message : String(error))
  },
)
