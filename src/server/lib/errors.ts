import type { ApiErrorBody } from '../../shared/api.ts'

export type ErrorCode = 'not_found' | 'bad_request' | 'forbidden'

const STATUS: Record<ErrorCode, 400 | 403 | 404> = {
  bad_request: 400,
  forbidden: 403,
  not_found: 404,
}

/** The only error the server throws on purpose. Anything else is a 500. */
export class AppError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }

  get status(): 400 | 403 | 404 {
    return STATUS[this.code]
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message } }
  }
}
