#!/usr/bin/env node
import os from 'node:os'
import path from 'node:path'
import { serve, type ServerType } from '@hono/node-server'
import { createApp, type MdifitApp } from '../server/app.ts'
import { AppError } from '../server/lib/errors.ts'
import { listFiles, resolveWorkspace } from '../server/modules/workspace/workspace.ts'
import { HELP, parseCliArgs } from './args.ts'
import { probePort } from './instance.ts'
import { candidatePorts, decidePort, noFreePortMessage, planStart } from './instance.rules.ts'
import { portsFile, rememberPort, rememberedPort } from './ports.ts'
import { openBrowser, packageRoot, packageVersion } from './system.ts'

async function main(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv)
  if (parsed.kind === 'help') return print(HELP)
  if (parsed.kind === 'version') return print(packageVersion())
  if (parsed.kind === 'error') return fail(`${parsed.message}\n\n${HELP}`)

  const { target, port, open } = parsed.options
  const config = await resolveWorkspace(target, process.cwd())
  const version = packageVersion()
  const clientDir = path.join(packageRoot(), 'dist', 'client')
  const memory = portsFile()

  // --port means exactly that port. Otherwise this folder's last port, then
  // DEFAULT_PORT and the next ones, so two folders can be open at once.
  const candidates =
    port === null ? candidatePorts(await rememberedPort(memory, config.target)) : [port]

  let mdifit: MdifitApp | null = null
  for (const candidate of candidates) {
    const url = `http://localhost:${candidate}`
    const probe = await probePort(candidate)
    if (port === null) {
      const decision = decidePort(probe, config.target)
      if (decision === 'skip') continue
      if (decision === 'reuse') return reuse(url, open)
    } else {
      const plan = planStart(probe, config.target, candidate)
      if (plan.kind === 'conflict') return fail(plan.message)
      if (plan.kind === 'reuse') return reuse(url, open)
    }

    mdifit ??= createApp({ config, version, clientDir })
    const server = await listen(mdifit.app.fetch, candidate)
    if (server === 'in-use') {
      // Taken between the probe and the bind.
      if (port === null) continue
      mdifit.close()
      return fail(`Port ${candidate} is already in use. Pass another --port, or leave it out.`)
    }

    await rememberPort(memory, config.target, candidate)
    const fileCount = (await listFiles(config)).length
    const relative = path.relative(process.cwd(), config.target)
    // Far-away folders read better as ~/… than as a long climb of ../
    const shown = relative.startsWith('..')
      ? config.target.replace(os.homedir(), '~')
      : relative || '.'
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

    const { close } = mdifit
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

  mdifit?.close()
  return fail(noFreePortMessage(candidatePorts(null)))
}

function reuse(url: string, open: boolean): number {
  console.log(`mdifit is already open for this folder: ${url}`)
  if (open) openBrowser(url)
  return 0
}

/** Starts listening, or reports that the port is taken. */
function listen(fetch: MdifitApp['app']['fetch'], port: number): Promise<ServerType | 'in-use'> {
  return new Promise((resolve, reject) => {
    const server = serve({ fetch, port, hostname: '127.0.0.1' }, () => resolve(server))
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') resolve('in-use')
      else reject(error)
    })
  })
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
