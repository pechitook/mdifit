/** Keyboard shortcuts. The key map is data, so the help dialog and the handler agree. */

export type ShortcutAction =
  | 'palette'
  | 'comment'
  | 'suggest'
  | 'toggleRead'
  | 'toggleMode'
  | 'prompt'
  | 'nextFile'
  | 'previousFile'
  | 'help'

export interface Shortcut {
  action: ShortcutAction
  keys: string
  label: string
}

export const SHORTCUTS: Shortcut[] = [
  { action: 'palette', keys: '⌘K', label: 'Search files, headings and text' },
  { action: 'comment', keys: 'C', label: 'Comment on the selection' },
  { action: 'suggest', keys: 'S', label: 'Suggest an edit to the selection' },
  { action: 'prompt', keys: 'P', label: 'Review and copy the prompt' },
  { action: 'toggleRead', keys: 'R', label: 'Mark the file read / unread' },
  { action: 'toggleMode', keys: 'V', label: 'Switch Read / Source view' },
  { action: 'nextFile', keys: ']', label: 'Next file' },
  { action: 'previousFile', keys: '[', label: 'Previous file' },
  { action: 'help', keys: '?', label: 'Show shortcuts' },
]

export interface KeyInput {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  /** True when focus is in a text field: single-key shortcuts must not fire. */
  editing: boolean
}

export function matchShortcut(input: KeyInput): ShortcutAction | null {
  const key = input.key.toLowerCase()
  if ((input.metaKey || input.ctrlKey) && !input.altKey && key === 'k') return 'palette'
  if (input.editing || input.metaKey || input.ctrlKey || input.altKey) return null
  switch (input.key) {
    case 'c':
      return 'comment'
    case 's':
      return 'suggest'
    case 'p':
      return 'prompt'
    case 'r':
      return 'toggleRead'
    case 'v':
      return 'toggleMode'
    case ']':
      return 'nextFile'
    case '[':
      return 'previousFile'
    case '?':
      return 'help'
    default:
      return null
  }
}
