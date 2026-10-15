/** Lowercase and strip diacritics, so `reconciliacion` matches `reconciliación`. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function pluralize(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/** `just now`, `5 min ago`, `3 h ago`, `2 d ago`, then the date. */
export function formatAge(mtimeMs: number, now: number): string {
  const minutes = Math.floor((now - mtimeMs) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days} d ago`
  return new Date(mtimeMs).toISOString().slice(0, 10)
}
