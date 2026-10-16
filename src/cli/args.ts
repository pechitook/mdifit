import { parseArgs } from 'node:util'

/**
 * One fixed port, always. Comments live in the browser's localStorage, which is
 * per origin: a port that moved would make every comment disappear.
 */
export const DEFAULT_PORT = 1905

export interface CliOptions {
  target: string
  port: number
  open: boolean
}

export type ParsedArgs =
  | { kind: 'run'; options: CliOptions }
  | { kind: 'help' }
  | { kind: 'version' }
  | { kind: 'error'; message: string }

export const HELP = `Usage: mdifit [path] [options]

Read Markdown in your browser, comment while you read, copy the review as a prompt.

Arguments:
  path            Folder or Markdown file to open (default: current folder)

Options:
  --port <port>   Port to serve on (default: ${DEFAULT_PORT}). Comments are stored
                  per port, so keep it stable.
  --no-open       Do not open the browser
  -v, --version   Print the version
  -h, --help      Print this help
`

export function parseCliArgs(argv: string[]): ParsedArgs {
  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      allowNegative: true,
      options: {
        port: { type: 'string' },
        open: { type: 'boolean', default: true },
        version: { type: 'boolean', short: 'v' },
        help: { type: 'boolean', short: 'h' },
      },
    })
  } catch (error) {
    return { kind: 'error', message: (error as Error).message }
  }

  const { values, positionals } = parsed
  if (values.help) return { kind: 'help' }
  if (values.version) return { kind: 'version' }
  if (positionals.length > 1) {
    return { kind: 'error', message: `Expected one path, got ${positionals.length}` }
  }

  const port = values.port === undefined ? DEFAULT_PORT : Number(values.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { kind: 'error', message: `Invalid port: ${values.port}` }
  }

  return { kind: 'run', options: { target: positionals[0] ?? '.', port, open: values.open } }
}
