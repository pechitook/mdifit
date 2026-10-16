/**
 * Typing `boca` outside a text field toggles the azul y oro theme. Its letters
 * collide with single-key shortcuts (B toggles the files panel, C comments), so
 * the rule decides, key by key, whether a shortcut runs: the first `b` behaves
 * as always, and once an `o` follows, the `b` is undone and the rest is swallowed.
 */

export const SECRET = 'boca'
/** Letters further apart than this start over. */
export const WINDOW_MS = 1500

export interface SecretState {
  typed: string
  at: number
}

export interface SecretStep {
  state: SecretState
  /** The key belongs to the word: skip its shortcut. */
  consumed: boolean
  /** The word is clearly being typed: undo what its first letter's shortcut did. */
  undoFirst: boolean
  /** The whole word was typed. */
  matched: boolean
}

export const NO_SECRET: SecretState = { typed: '', at: 0 }

export function typeSecret(state: SecretState, key: string, now: number): SecretStep {
  const typed = now - state.at <= WINDOW_MS ? state.typed : ''
  if (key === SECRET[typed.length]) {
    const next = typed + key
    const matched = next === SECRET
    return {
      state: { typed: matched ? '' : next, at: now },
      consumed: next.length >= 2,
      undoFirst: next.length === 2,
      matched,
    }
  }
  const restart = key === SECRET[0]
  return {
    state: { typed: restart ? key : '', at: now },
    consumed: false,
    undoFirst: false,
    matched: false,
  }
}
