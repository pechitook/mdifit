/** Browser-only helpers: selection, clipboard, focus. Kept small; the rules live in pure modules. */

export interface SelectionRange {
  startLine: number
  endLine: number
  quote: string
  rect: DOMRect
}

/**
 * The current selection inside `container`, mapped to the source lines of the
 * elements it starts and ends in. Only text marked `data-doc` counts, so
 * selecting inside a comment card does nothing.
 */
export function readSelection(container: HTMLElement): SelectionRange | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null

  const quote = selection.toString().trim()
  const start = lineElement(range.startContainer, container)
  const end = lineElement(range.endContainer, container)
  if (!quote || !start || !end) return null

  const lines = [start, end].flatMap((el) => [
    Number(el.dataset.lineStart),
    Number(el.dataset.lineEnd ?? el.dataset.lineStart),
  ])
  return {
    startLine: Math.min(...lines),
    endLine: Math.max(...lines),
    quote,
    rect: range.getBoundingClientRect(),
  }
}

function lineElement(node: Node, container: HTMLElement): HTMLElement | null {
  const element = node instanceof HTMLElement ? node : node.parentElement
  if (!element?.closest('[data-doc]')) return null
  const line = element.closest<HTMLElement>('[data-line-start]')
  return line && container.contains(line) ? line : null
}

export function clearSelection(): void {
  window.getSelection()?.removeAllRanges()
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

/** True when keys typed now go into a text field. */
export function isEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Scrolls an element into view and flashes it so the eye finds it. */
export function revealElement(
  element: Element | null,
  block: ScrollLogicalPosition = 'center',
): void {
  if (!element) return
  element.scrollIntoView({ block, behavior: 'smooth' })
  element.classList.remove('flash')
  void (element as HTMLElement).offsetWidth
  element.classList.add('flash')
}
