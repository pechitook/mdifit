import MarkdownIt, { type Env, type StateCore, type Token } from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdownLang from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import { encodePath, isExternalHref, isMarkdownHref, resolveRelative } from './paths.ts'
import { formatHash } from './route.ts'

/**
 * Markdown → HTML split into top-level blocks, each tagged with the source
 * lines it came from. The blocks are what lets the reader place comments
 * between them and turn a selection into `file:L12-L14`.
 */

export interface RenderedBlock {
  key: string
  html: string
  /** 1-based, inclusive. */
  startLine: number
  endLine: number
}

export interface OutlineHeading {
  level: number
  text: string
  slug: string
  line: number
}

export interface RenderedDoc {
  blocks: RenderedBlock[]
  headings: OutlineHeading[]
}

const LANGUAGES = {
  bash,
  css,
  diff,
  go,
  javascript,
  json,
  markdown: markdownLang,
  python,
  rust,
  shell,
  sql,
  typescript,
  xml,
  yaml,
}
for (const [name, language] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, language)

const ALERTS: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

interface RenderEnv extends Env {
  filePath: string
  headings: OutlineHeading[]
  slugs: Map<string, number>
}

// Raw HTML stays escaped: a document must never run script on the app's origin.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  highlight(code, lang) {
    const language = lang.trim().toLowerCase()
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value
    }
    return ''
  },
})

md.core.ruler.push('mdifit', (state) => {
  const env = state.env as RenderEnv
  const tokens = state.tokens
  const lines = state.src.split('\n')
  tokens.forEach((token, index) => {
    if (token.map && token.block && token.nesting !== -1) {
      token.attrSet('data-line-start', String(token.map[0] + 1))
      token.attrSet('data-line-end', String(lastContentLine(lines, token.map[0], token.map[1])))
    }
    if (token.type === 'heading_open') tagHeading(token, tokens[index + 1], env)
    if (token.type === 'blockquote_open') tagAlert(token, tokens, index)
    if (token.type === 'list_item_open') tagTaskItem(state, token, index)
    if (token.type === 'inline') rewriteLinks(token.children ?? [], env.filePath)
  })
})

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const href = String(token?.attrGet('href') ?? '')
  if (token && isExternalHref(href) && !href.startsWith('/')) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

export function renderMarkdown(source: string, filePath: string): RenderedDoc {
  const env: RenderEnv = { filePath, headings: [], slugs: new Map() }
  const tokens = md.parse(blankFrontMatter(source), env)
  const blocks: RenderedBlock[] = []

  let start = 0
  let depth = 0
  tokens.forEach((token, index) => {
    depth += token.nesting
    if (depth !== 0) return
    const group = tokens.slice(start, index + 1)
    const map = group[0]?.map
    if (map) {
      blocks.push({
        key: `${map[0]}-${map[1]}-${blocks.length}`,
        html: md.renderer.render(group, md.options, env),
        startLine: map[0] + 1,
        endLine: Number(group[0]?.attrGet('data-line-end') ?? map[0] + 1),
      })
    }
    start = index + 1
  })

  return { blocks, headings: env.headings }
}

/**
 * Front matter is not rendered, but its lines are kept as blank lines so every
 * block still reports its real source line.
 */
export function blankFrontMatter(source: string): string {
  const lines = source.split('\n')
  if (lines[0]?.trim() !== '---') return source
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
  if (end < 0) return source
  return lines.map((line, i) => (i <= end ? '' : line)).join('\n')
}

/**
 * markdown-it maps a block up to the next one, trailing blank lines included.
 * Comments point at text, so the range stops at the last non-blank line.
 */
function lastContentLine(lines: string[], start: number, end: number): number {
  let last = end - 1
  while (last > start && (lines[last] ?? '').trim() === '') last--
  return last + 1
}

/** GitHub-style heading ids: `Scope of the first delivery` → `scope-of-the-first-delivery`. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
}

function tagHeading(token: Token, inline: Token | undefined, env: RenderEnv): void {
  const text = (inline?.children ?? [])
    .filter((child) => child.type === 'text' || child.type === 'code_inline')
    .map((child) => child.content)
    .join('')
  const base = slugify(text) || 'section'
  const seen = env.slugs.get(base) ?? 0
  env.slugs.set(base, seen + 1)
  const slug = seen === 0 ? base : `${base}-${seen}`
  token.attrSet('id', slug)
  env.headings.push({
    level: Number(token.tag.slice(1)),
    text,
    slug,
    line: (token.map?.[0] ?? 0) + 1,
  })
}

/** `> [!NOTE]` blockquotes become alerts, like on GitHub. */
function tagAlert(token: Token, tokens: Token[], index: number): void {
  const inline = tokens[index + 2]
  if (tokens[index + 1]?.type !== 'paragraph_open' || inline?.type !== 'inline') return
  const match = /^\[!(\w+)\]\s*/.exec(inline.content)
  const type = match?.[1]?.toLowerCase()
  const title = type ? ALERTS[type] : undefined
  if (!match || !type || !title) return

  token.attrJoin('class', `alert alert-${type}`)
  token.attrSet('data-alert', title)
  inline.content = inline.content.slice(match[0].length)
  const children = inline.children ?? []
  const first = children[0]
  if (first?.type === 'text') {
    first.content = first.content.replace(/^\[!\w+\]\s*/, '')
    if (first.content === '' && children[1]?.type === 'softbreak') children.splice(0, 2)
    else if (first.content === '') children.splice(0, 1)
  }
}

/** `- [ ] todo` and `- [x] done` render as disabled checkboxes. */
function tagTaskItem(state: StateCore, token: Token, index: number): void {
  const tokens = state.tokens
  const inline = tokens[index + 2]
  if (tokens[index + 1]?.type !== 'paragraph_open' || inline?.type !== 'inline') return
  const first = inline.children?.[0]
  const match = first?.type === 'text' ? /^\[([ xX])\]\s+/.exec(first.content) : null
  if (!first || !match) return

  first.content = first.content.slice(match[0].length)
  const checkbox = new state.Token('html_inline', '', 0)
  checkbox.content = `<input type="checkbox" disabled${match[1] === ' ' ? '' : ' checked'}> `
  inline.children?.unshift(checkbox)
  token.attrJoin('class', 'task-item')
}

/** Relative Markdown links open inside mdifit; relative images load through `/raw/`. */
function rewriteLinks(children: Token[], filePath: string): void {
  for (const child of children) {
    if (child.type === 'link_open') {
      const href = String(child.attrGet('href') ?? '')
      if (!href || isExternalHref(href)) continue
      if (href.startsWith('#')) {
        child.attrSet('href', formatHash({ path: filePath, anchor: href.slice(1) }))
        continue
      }
      const [target = '', anchor = ''] = href.split('#')
      const resolved = resolveRelative(filePath, target)
      if (!resolved) continue
      child.attrSet(
        'href',
        isMarkdownHref(resolved)
          ? formatHash({ path: resolved, anchor: anchor || null })
          : `/raw/${encodePath(resolved)}`,
      )
    }
    if (child.type === 'image') {
      const src = String(child.attrGet('src') ?? '')
      const resolved = src && !isExternalHref(src) ? resolveRelative(filePath, src) : null
      if (resolved) child.attrSet('src', `/raw/${encodePath(resolved)}`)
      child.attrSet('loading', 'lazy')
    }
  }
}
