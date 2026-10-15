<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { FileResponse } from '../../../shared/api.ts'
import Icon from '../../components/ui/Icon.vue'
import type { ReadStatus, ReviewComment } from '../../stores/review.helpers.ts'
import {
  type SelectionRange,
  clearSelection,
  copyText,
  readSelection,
  revealElement,
} from '../../utils/dom.ts'
import type { RenderedBlock, RenderedDoc } from '../../utils/markdown.ts'
import { formatComment, formatLocation } from '../../utils/prompt.ts'
import { locateQuote } from '../../utils/quote.ts'
import { formatHash, lineAnchor } from '../../utils/route.ts'
import {
  type Draft,
  type DraftMode,
  type Marker,
  type PopoverPlacement,
  blockAtLine,
  draftFromComment,
  draftToComment,
  newDraft,
  originalText,
  placePopover,
  readingOrder,
  stackMarkers,
  switchMode,
} from './Reader.helpers.ts'
import CommentCard from './components/CommentCard.vue'
import CommentComposer from './components/CommentComposer.vue'
import MarginComment from './components/MarginComment.vue'
import MarginComposer from './components/MarginComposer.vue'
import ReadView from './components/ReadView.vue'
import SelectionToolbar from './components/SelectionToolbar.vue'
import SourceView from './components/SourceView.vue'
import {
  blockElement,
  boxWithin,
  clearPaint,
  findQuoteRange,
  insertPreview,
  isLive,
  paint,
  removePreview,
} from './marks.ts'

/**
 * One file, in the Read or Source view. In Read, comments are marks in the
 * text plus bubbles in the right margin; writing and opening one happens in a
 * popover beside the text, so nothing pushes the page around. Source keeps
 * line numbers and shows comments inline.
 */

type CommentInput = Omit<ReviewComment, 'id' | 'createdAt'>

const props = defineProps<{
  file: FileResponse
  rendered: RenderedDoc
  comments: ReviewComment[]
  promptBase: string
  mode: 'read' | 'source'
  anchor: string | null
  status: ReadStatus
  nextPath: string | null
}>()

const emit = defineEmits<{
  add: [input: CommentInput]
  update: [id: string, input: CommentInput]
  remove: [id: string]
  toggleRead: []
  toast: [message: string]
}>()

/** Size of a margin bubble, the right gutter it sits in, and a popover's width. */
const BUBBLE = 28
const GUTTER = 72
const POPOVER_WIDTH = 296

const scroller = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const draft = ref<Draft | null>(null)
const selection = ref<SelectionRange | null>(null)
const openId = ref<string | null>(null)
const markers = ref<(Marker & { suggestion: boolean })[]>([])
const popover = ref<PopoverPlacement | null>(null)

/** Rendered text the draft is about (Read view), kept to mark it and anchor the popover. */
let pendingRange: Range | null = null
let preview: HTMLElement | null = null
const ranges = new Map<string, Range | null>()

const lines = computed(() => props.file.source.split('\n'))
const ordered = computed(() => readingOrder(props.comments))
const openComment = computed(() => props.comments.find((c) => c.id === openId.value) ?? null)
const openIndex = computed(() => ordered.value.findIndex((c) => c.id === openId.value))

function commentsAfterLine(line: number): ReviewComment[] {
  const last = lines.value.length
  return props.comments.filter((c) => Math.min(c.endLine, last) === line)
}

function visible(comments: ReviewComment[]): ReviewComment[] {
  return comments.filter((c) => c.id !== draft.value?.editingId)
}

function location(range: { startLine: number; endLine: number }): string {
  return formatLocation({ ...range, path: props.file.path } as ReviewComment, props.promptBase)
}

// --- marks and margin (Read view) ----------------------------------------------

function anchorOf(root: HTMLElement): Range | Element | null {
  if (draft.value) return pendingRange ?? blockElement(root, draft.value.startLine)
  const comment = openComment.value
  if (comment) return ranges.get(comment.id) ?? blockElement(root, comment.startLine)
  return null
}

/** Recomputes marks, bubbles and the popover position from the rendered page. */
function layout(): void {
  const root = content.value
  if (!root || props.mode !== 'read') {
    clearPaint()
    markers.value = []
    popover.value = null
    return
  }

  const current = draft.value
  if (current?.quote && !isLive(pendingRange)) pendingRange = findQuoteRange(root, current)
  updatePreview()

  ranges.clear()
  const commentRanges: Range[] = []
  const suggestRanges: Range[] = []
  const raw: Marker[] = []
  for (const comment of props.comments) {
    if (comment.id === current?.editingId) continue
    const range = findQuoteRange(root, comment)
    ranges.set(comment.id, range)
    if (range) (comment.suggestion === null ? commentRanges : suggestRanges).push(range)
    const target = range ?? blockElement(root, comment.startLine)
    if (target) raw.push({ id: comment.id, top: boxWithin(root, target).top })
  }

  paint('mdifit-comment', commentRanges)
  paint('mdifit-suggest', suggestRanges)
  const active = openId.value ? ranges.get(openId.value) : null
  paint('mdifit-active', active ? [active] : [])
  const pending = current && pendingRange ? [pendingRange] : []
  paint('mdifit-pending', current?.mode === 'comment' ? pending : [])
  paint('mdifit-del', current?.mode === 'suggest' ? pending : [])

  const suggestions = new Set(props.comments.filter((c) => c.suggestion !== null).map((c) => c.id))
  markers.value = stackMarkers(raw, BUBBLE).map((m) => ({
    ...m,
    suggestion: suggestions.has(m.id),
  }))

  const anchor = anchorOf(root)
  const reader = scroller.value?.getBoundingClientRect()
  popover.value =
    anchor && reader
      ? placePopover({
          anchor: boxWithin(root, anchor),
          pageWidth: root.offsetWidth,
          marginSpace: reader.right - root.getBoundingClientRect().right,
          gutter: GUTTER,
          width: POPOVER_WIDTH,
        })
      : null
}

/** While suggesting, the replacement shows right after the struck-through original. */
function updatePreview(): void {
  removePreview(preview)
  preview = null
  const current = draft.value
  if (current?.mode !== 'suggest' || !isLive(pendingRange)) return
  if (current.suggestion === originalText(current, lines.value)) return
  preview = insertPreview(pendingRange, current.suggestion)
}

let frame = 0
function scheduleLayout(): void {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(layout)
}

// --- selection -----------------------------------------------------------------

function captureSelection(): void {
  // Let the browser settle the selection after mouseup / shift+arrow keys.
  requestAnimationFrame(() => {
    const found = content.value ? readSelection(content.value) : null
    if (!found) {
      selection.value = null
      return
    }
    // In the rendered view a selection only knows its block; narrow it to the quoted lines.
    const range = props.mode === 'read' ? locateQuote(lines.value, found, found.quote) : found
    selection.value = { ...found, startLine: range.startLine, endLine: range.endLine }
  })
}

function onSelectionChange(): void {
  if (selection.value && window.getSelection()?.isCollapsed) selection.value = null
}

/** Starts a comment or suggestion from the current selection. False when there is none. */
function startFromSelection(mode: DraftMode): boolean {
  const found = selection.value
  if (!found) return false
  openId.value = null
  pendingRange = props.mode === 'read' ? found.range : null
  draft.value = newDraft(
    mode,
    { startLine: found.startLine, endLine: found.endLine, quote: found.quote },
    lines.value,
  )
  selection.value = null
  clearSelection()
  return true
}

async function copyRef(): Promise<void> {
  const found = selection.value
  if (!found) return
  const text = formatComment(
    {
      id: '',
      path: props.file.path,
      startLine: found.startLine,
      endLine: found.endLine,
      quote: found.quote,
      body: '',
      suggestion: null,
      createdAt: 0,
    },
    { promptBase: props.promptBase, includeQuotes: true },
  )
  if (await copyText(text)) emit('toast', 'Reference copied')
  selection.value = null
  clearSelection()
}

// --- drafts --------------------------------------------------------------------

function addAtBlock(block: RenderedBlock): void {
  openId.value = null
  pendingRange = null
  draft.value = newDraft(
    'comment',
    { startLine: block.startLine, endLine: block.endLine, quote: null },
    lines.value,
  )
}

function addAtRange(range: { startLine: number; endLine: number }): void {
  pendingRange = null
  draft.value = newDraft('comment', { ...range, quote: null }, lines.value)
}

function onSwitchMode(mode: DraftMode): void {
  if (draft.value) draft.value = switchMode(draft.value, mode, lines.value)
}

function closeDraft(): void {
  removePreview(preview)
  preview = null
  pendingRange = null
  draft.value = null
}

function isEmpty(current: Draft): boolean {
  return (
    !current.body.trim() &&
    (current.mode === 'comment' || current.suggestion === originalText(current, lines.value))
  )
}

function save(): void {
  const current = draft.value
  if (!current) return
  const input = draftToComment(current, props.file.path, lines.value)
  if (!input) {
    emit(
      'toast',
      current.mode === 'suggest' ? 'Change the text to suggest an edit' : 'Write a comment first',
    )
    return
  }
  if (current.editingId) emit('update', current.editingId, input)
  else emit('add', input)
  closeDraft()
}

function edit(comment: ReviewComment): void {
  pendingRange = ranges.get(comment.id)?.cloneRange() ?? null
  openId.value = null
  draft.value = draftFromComment(comment)
}

function remove(comment: ReviewComment): void {
  openId.value = null
  emit('remove', comment.id)
}

async function copyOne(comment: ReviewComment): Promise<void> {
  const ok = await copyText(
    formatComment(comment, { promptBase: props.promptBase, includeQuotes: true }),
  )
  if (ok) emit('toast', 'Prompt copied')
}

// --- opening comments ------------------------------------------------------------

function open(id: string): void {
  if (draft.value && !isEmpty(draft.value)) return
  closeDraft()
  openId.value = openId.value === id ? null : id
}

async function step(delta: 1 | -1): Promise<void> {
  const list = ordered.value
  if (list.length === 0) return
  const next = list[(openIndex.value + delta + list.length) % list.length]
  if (!next) return
  openId.value = next.id
  await nextTick()
  const root = content.value
  const target =
    ranges.get(next.id)?.startContainer.parentElement ??
    (root ? blockElement(root, next.startLine) : null)
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

/** Clicking outside closes an opened comment, and an untouched draft. */
function onPointerDown(event: PointerEvent): void {
  const target = event.target as Element | null
  if (target?.closest('.margin-pop, .bubble, .toolbar')) return
  openId.value = null
  if (draft.value && props.mode === 'read' && isEmpty(draft.value)) closeDraft()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && openId.value) openId.value = null
}

// --- scrolling -----------------------------------------------------------------

let shownPath: string | null = null

async function revealAnchor(): Promise<void> {
  await nextTick()
  const root = content.value
  if (!root) return
  const pathChanged = shownPath !== props.file.path
  shownPath = props.file.path

  // In the Read view a comment anchor opens its popover.
  if (props.mode === 'read' && props.anchor?.startsWith('comment-')) {
    const id = props.anchor.slice('comment-'.length)
    if (props.comments.some((c) => c.id === id)) {
      openId.value = id
      layout()
      const target = ranges.get(id)?.startContainer.parentElement
      revealElement(
        target ?? blockElement(root, props.comments.find((c) => c.id === id)?.startLine ?? 1),
      )
      return
    }
  }

  // In the Source view a heading anchor scrolls to the heading's line.
  const headingLine =
    props.mode === 'source'
      ? props.rendered.headings.find((heading) => heading.slug === props.anchor)?.line
      : undefined
  const line = lineAnchor(props.anchor) ?? headingLine ?? null
  if (line !== null) {
    const selector =
      props.mode === 'read'
        ? `.block[data-line-start="${blockAtLine(props.rendered.blocks, line)?.startLine}"]`
        : `.src-line[data-line-start="${line}"]`
    revealElement(root.querySelector(selector))
  } else if (props.anchor) {
    const target = document.getElementById(props.anchor)
    if (target && root.contains(target)) {
      revealElement(target, props.anchor.startsWith('comment-') ? 'center' : 'start')
    }
  } else if (pathChanged) {
    scroller.value?.scrollTo({ top: 0 })
  }
}

watch(
  () => props.file.path,
  () => {
    closeDraft()
    openId.value = null
  },
)
watch(() => [props.file.path, props.anchor, props.mode], revealAnchor, { immediate: true })
watch(
  () => [
    props.rendered,
    props.comments,
    props.mode,
    openId.value,
    draft.value,
    draft.value?.mode,
    draft.value?.suggestion,
  ],
  () => void nextTick(scheduleLayout),
  { immediate: true },
)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', scheduleLayout)
  resizeObserver = new ResizeObserver(scheduleLayout)
  if (content.value) resizeObserver.observe(content.value)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
  document.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', scheduleLayout)
  resizeObserver?.disconnect()
  cancelAnimationFrame(frame)
  removePreview(preview)
  clearPaint()
})

defineExpose({ startFromSelection })
</script>

<template>
  <main ref="scroller" class="reader" @scroll.passive="selection = null">
    <article
      ref="content"
      class="page"
      :class="mode"
      @mouseup="captureSelection"
      @keyup.shift="captureSelection"
    >
      <div v-if="$slots.before" class="before">
        <slot name="before" />
      </div>

      <template v-if="mode === 'read'">
        <ReadView :blocks="rendered.blocks" @add-at="addAtBlock" />

        <button
          v-for="marker in markers"
          :key="marker.id"
          type="button"
          class="bubble"
          :class="{ active: marker.id === openId }"
          :style="{ top: `${marker.top}px` }"
          :aria-label="marker.suggestion ? 'Open suggested edit' : 'Open comment'"
          :aria-expanded="marker.id === openId"
          @click="open(marker.id)"
        >
          <Icon :name="marker.suggestion ? 'edit' : 'comment'" :size="14" />
        </button>

        <MarginComposer
          v-if="draft && popover"
          :key="`${draft.startLine}-${draft.endLine}-${draft.editingId}`"
          :draft="draft"
          :placement="popover"
          @switch-mode="onSwitchMode"
          @save="save"
          @cancel="closeDraft"
        />
        <MarginComment
          v-else-if="openComment && popover"
          :comment="openComment"
          :placement="popover"
          :index="openIndex"
          :total="ordered.length"
          @previous="step(-1)"
          @next="step(1)"
          @copy="copyOne(openComment)"
          @edit="edit(openComment)"
          @remove="remove(openComment)"
        />
      </template>

      <SourceView v-else :lines="lines" @add-at="addAtRange">
        <template #after="{ line }">
          <CommentCard
            v-for="comment in visible(commentsAfterLine(line))"
            :key="comment.id"
            :comment="comment"
            :prompt-base="promptBase"
            @edit="edit(comment)"
            @remove="emit('remove', comment.id)"
            @copy="copyOne(comment)"
          />
          <CommentComposer
            v-if="draft && Math.min(draft.endLine, lines.length) === line"
            :key="`${draft.startLine}-${draft.endLine}-${draft.editingId}`"
            :draft="draft"
            :lines="lines"
            :location="location(draft)"
            @switch-mode="onSwitchMode"
            @save="save"
            @cancel="closeDraft"
          />
        </template>
      </SourceView>

      <p v-if="file.source.trim() === ''" class="empty">This file is empty.</p>

      <footer class="end">
        <button
          type="button"
          class="btn"
          :class="status === 'read' ? '' : 'btn-primary'"
          title="R"
          @click="emit('toggleRead')"
        >
          <Icon name="check" />
          {{
            status === 'read'
              ? 'Read · mark unread'
              : status === 'edited'
                ? 'Changed since you read it · mark read'
                : 'Mark as read'
          }}
        </button>
        <a v-if="nextPath" class="next" :href="formatHash({ path: nextPath, anchor: null })">
          Next: {{ nextPath }} <Icon name="arrow-right" />
        </a>
      </footer>
    </article>

    <SelectionToolbar
      v-if="selection"
      :rect="selection.rect"
      @comment="startFromSelection('comment')"
      @suggest="startFromSelection('suggest')"
      @copy-ref="copyRef"
    />
  </main>
</template>

<style scoped>
.reader {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--surface);
}

.page {
  position: relative;
  margin: 0 auto;
}

/* 720px of text, a gutter for the + on the left and one for the bubbles on the right. */
.page.read {
  max-width: 840px;
  padding: 56px 72px 120px 48px;
}

.page.source {
  max-width: 1040px;
  padding: 40px 32px 80px 8px;
}

.page.source .before,
.page.source .empty,
.page.source .end {
  margin-left: 56px;
}

.empty {
  color: var(--text-muted);
}

.bubble {
  position: absolute;
  right: 22px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  color: var(--text-muted);
}

.bubble:hover {
  border-color: var(--mark-line);
  color: var(--text);
}

.bubble.active {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-text);
}

.end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.end .btn {
  min-height: 44px;
}

.next {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

@media (max-width: 700px) {
  .page.read {
    padding: 24px 52px 64px 16px;
  }

  .bubble {
    right: 12px;
  }

  .page.source {
    padding: 24px 16px 64px 0;
  }
}
</style>
