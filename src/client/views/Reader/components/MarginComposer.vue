<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { type Draft, type DraftMode, type PopoverPlacement, linesLabel } from '../Reader.helpers.ts'

/**
 * The comment composer as a small popover next to the text. The draft is the
 * reader's live model: fields are edited in place, the reader saves it.
 */
defineProps<{ draft: Draft; placement: PopoverPlacement }>()
const emit = defineEmits<{ switchMode: [mode: DraftMode]; save: []; cancel: [] }>()

const field = ref<HTMLTextAreaElement | null>(null)

onMounted(async () => {
  await nextTick()
  field.value?.focus({ preventScroll: true })
})

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    emit('save')
  } else if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
  }
}

async function setMode(mode: DraftMode): Promise<void> {
  emit('switchMode', mode)
  await nextTick()
  field.value?.focus({ preventScroll: true })
}
</script>

<template>
  <form
    class="margin-pop"
    :class="placement.side"
    :style="{ top: `${placement.top}px`, left: `${placement.left}px` }"
    :aria-label="draft.mode === 'suggest' ? 'Suggest an edit' : 'New comment'"
    @submit.prevent="emit('save')"
    @keydown="onKeydown"
  >
    <div class="top">
      <span>{{ linesLabel(draft) }}</span>
      <div class="kind" role="radiogroup" aria-label="Kind">
        <button
          type="button"
          role="radio"
          :aria-checked="draft.mode === 'comment'"
          @click="setMode('comment')"
        >
          Comment
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="draft.mode === 'suggest'"
          @click="setMode('suggest')"
        >
          Suggest edit
        </button>
      </div>
    </div>

    <label v-if="draft.mode === 'comment'" class="plain">
      <span class="visually-hidden">Comment</span>
      <textarea ref="field" v-model="draft.body" rows="3" placeholder="Add a comment…" />
    </label>

    <template v-else>
      <label class="field">
        Replace with
        <textarea ref="field" v-model="draft.suggestion" rows="3" />
      </label>
      <label class="field">
        <span>Why <span class="optional">(optional)</span></span>
        <input v-model="draft.body" type="text" />
      </label>
    </template>

    <div class="foot">
      <span class="hint">{{
        draft.mode === 'suggest' ? 'Preview in the text' : '⌘↵ to save'
      }}</span>
      <button type="button" class="ghost" @click="emit('cancel')">Cancel</button>
      <button type="submit" class="primary">
        {{ draft.editingId ? 'Save' : draft.mode === 'suggest' ? 'Suggest' : 'Comment' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.kind {
  display: flex;
  gap: 2px;
}

.kind button {
  padding: 3px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}

.kind button[aria-checked='true'] {
  background: var(--sunken);
  color: var(--text);
}

.plain {
  display: flex;
}

.plain textarea {
  width: 100%;
  min-height: 72px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}

.optional {
  font-weight: 400;
}

.field textarea,
.field input {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: 0;
  background: var(--surface);
  font-size: 15px;
  line-height: 1.5;
  color: var(--text);
  resize: vertical;
}

.field textarea:focus,
.field input:focus {
  border-color: var(--suggest-line);
}

.hint {
  margin-right: auto;
  font-size: 12px;
  color: var(--text-faint);
}
</style>
