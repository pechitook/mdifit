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
  blockAtLine,
  draftFromComment,
  draftToComment,
  newDraft,
  placeAfterBlocks,
  switchMode,
} from './Reader.helpers.ts'
import CommentCard from './components/CommentCard.vue'
import CommentComposer from './components/CommentComposer.vue'
import ReadView from './components/ReadView.vue'
import SelectionToolbar from './components/SelectionToolbar.vue'
import SourceView from './components/SourceView.vue'

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

const scroller = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const draft = ref<Draft | null>(null)
const selection = ref<SelectionRange | null>(null)

const lines = computed(() => props.file.source.split('\n'))

const readPlacement = computed(() => placeAfterBlocks(props.rendered.blocks, props.comments))
const draftBlockKey = computed(() =>
  draft.value ? (blockAtLine(props.rendered.blocks, draft.value.endLine)?.key ?? null) : null,
)

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

// --- selection ---------------------------------------------------------------

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
  const range = selection.value
  if (!range) return false
  draft.value = newDraft(
    mode,
    { startLine: range.startLine, endLine: range.endLine, quote: range.quote },
    lines.value,
  )
  selection.value = null
  clearSelection()
  return true
}

async function copyRef(): Promise<void> {
  const range = selection.value
  if (!range) return
  const text = formatComment(
    {
      id: '',
      path: props.file.path,
      startLine: range.startLine,
      endLine: range.endLine,
      quote: range.quote,
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

// --- drafts ------------------------------------------------------------------

function addAtBlock(block: RenderedBlock): void {
  draft.value = newDraft(
    'comment',
    { startLine: block.startLine, endLine: block.endLine, quote: null },
    lines.value,
  )
}

function addAtRange(range: { startLine: number; endLine: number }): void {
  draft.value = newDraft('comment', { ...range, quote: null }, lines.value)
}

function onSwitchMode(mode: DraftMode): void {
  if (draft.value) draft.value = switchMode(draft.value, mode, lines.value)
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
  draft.value = null
}

function edit(comment: ReviewComment): void {
  draft.value = draftFromComment(comment)
}

async function copyOne(comment: ReviewComment): Promise<void> {
  const ok = await copyText(
    formatComment(comment, { promptBase: props.promptBase, includeQuotes: true }),
  )
  if (ok) emit('toast', 'Prompt copied')
}

// --- scrolling ---------------------------------------------------------------

let shownPath: string | null = null

async function revealAnchor(): Promise<void> {
  await nextTick()
  const root = content.value
  if (!root) return
  const pathChanged = shownPath !== props.file.path
  shownPath = props.file.path

  const line = lineAnchor(props.anchor)
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
  () => (draft.value = null),
)
watch(() => [props.file.path, props.anchor, props.mode], revealAnchor, { immediate: true })

onMounted(() => document.addEventListener('selectionchange', onSelectionChange))
onBeforeUnmount(() => document.removeEventListener('selectionchange', onSelectionChange))

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

      <ReadView v-if="mode === 'read'" :blocks="rendered.blocks" @add-at="addAtBlock">
        <template #after="{ block }">
          <CommentCard
            v-for="comment in visible(readPlacement.get(block.key) ?? [])"
            :key="comment.id"
            :comment="comment"
            :prompt-base="promptBase"
            @edit="edit(comment)"
            @remove="emit('remove', comment.id)"
            @copy="copyOne(comment)"
          />
          <CommentComposer
            v-if="draft && draftBlockKey === block.key"
            :key="`${draft.startLine}-${draft.endLine}-${draft.editingId}`"
            :draft="draft"
            :lines="lines"
            :location="location(draft)"
            @switch-mode="onSwitchMode"
            @save="save"
            @cancel="draft = null"
          />
        </template>
      </ReadView>

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
            @cancel="draft = null"
          />
        </template>
      </SourceView>

      <p v-if="file.source.trim() === ''" class="empty">This file is empty.</p>

      <footer class="end">
        <button
          type="button"
          class="btn"
          :class="status === 'read' ? '' : 'btn-primary'"
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
          <kbd>R</kbd>
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
  overflow-y: auto;
  background: var(--surface);
}

.page {
  max-width: 880px;
  margin: 0 auto;
  padding: 40px 32px 80px 8px;
}

.page.source {
  max-width: 1040px;
}

.before {
  margin-left: 56px;
}

.empty {
  margin-left: 56px;
  color: var(--text-muted);
}

.end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin: 48px 0 0 56px;
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
  .page {
    padding: 24px 16px 64px 0;
  }
}
</style>
