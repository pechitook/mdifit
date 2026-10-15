import { snapEnd, snapStart } from './textRange.ts'

/** Browser-only helpers: selection, clipboard, focus. Kept small; the rules live in pure modules. */

export interface SelectionRange {
  startLine: number
  endLine: number
  quote: string
  rect: DOMRect
  /** The selection, snapped to whole words. */
  range: Range
}

/**
 * The current selection inside `container`, snapped to whole words and mapped
 * to the source lines of the elements it starts and ends in. Only text marked
 * `data-doc` counts, so selecting inside a comment or a popover does nothing.
 */
export function readSelection(container: HTMLElement): SelectionRange | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0).cloneRange()
  if (!container.contains(range.commonAncestorContainer)) return null

  snapToWords(range)
  if (range.collapsed) return null
  // Show the snapped selection, so what is highlighted is what gets quoted.
  selection.removeAllRanges()
  selection.addRange(range)

  const quote = range.toString().trim()
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
    range: range.cloneRange(),
  }
}

function snapToWords(range: Range): void {
  const { startContainer, endContainer } = range
  if (startContainer instanceof Text) {
    range.setStart(startContainer, snapStart(startContainer.data, range.startOffset))
  }
  if (endContainer instanceof Text) {
    const end = snapEnd(endContainer.data, range.endOffset)
    if (endContainer !== range.startContainer || end >= range.startOffset) {
      range.setEnd(endContainer, end)
    }
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
