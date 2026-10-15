<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { type Draft, type DraftMode, originalText } from '../Reader.helpers.ts'

defineProps<{ draft: Draft; location: string; lines: string[] }>()
const emit = defineEmits<{ switchMode: [mode: DraftMode]; save: []; cancel: [] }>()

// The draft is the reader's live model: fields are edited in place, the reader saves it.
const field = ref<HTMLTextAreaElement | null>(null)

onMounted(async () => {
  await nextTick()
  field.value?.focus()
  field.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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
  field.value?.focus()
}
</script>

<template>
  <form class="composer" :class="draft.mode" @submit.prevent="emit('save')" @keydown="onKeydown">
    <header>
      <code class="ref">{{ location }}</code>
      <div class="segmented" role="radiogroup" aria-label="Kind">
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
    </header>

    <template v-if="draft.mode === 'comment'">
      <blockquote v-if="draft.quote">{{ draft.quote }}</blockquote>
      <label>
        <span class="visually-hidden">Comment</span>
        <textarea ref="field" v-model="draft.body" rows="3" placeholder="What should change?" />
      </label>
    </template>

    <template v-else>
      <div class="original">
        <span class="label">Replace</span>
        <pre>{{ originalText(draft, lines) }}</pre>
      </div>
      <label class="replacement">
        <span class="label">With</span>
        <textarea ref="field" v-model="draft.suggestion" rows="3" />
      </label>
      <label>
        <span class="label">Why (optional)</span>
        <input v-model="draft.body" type="text" />
      </label>
    </template>

    <footer>
      <span class="hint"><kbd>⌘↵</kbd> save · <kbd>Esc</kbd> cancel</span>
      <button type="button" class="btn" @click="emit('cancel')">Cancel</button>
      <button
        type="submit"
        class="btn"
        :class="draft.mode === 'suggest' ? 'btn-suggest' : 'btn-primary'"
      >
        {{ draft.editingId ? 'Save' : draft.mode === 'suggest' ? 'Add suggestion' : 'Add comment' }}
      </button>
    </footer>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 4px 0 18px;
  padding: 12px 14px;
  border: 1px solid var(--comment-border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow:
    0 0 0 4px var(--comment-ring),
    var(--shadow-card);
  font-family: var(--font-sans);
  font-size: 15px;
}

.composer.suggest {
  border-color: var(--suggest);
  box-shadow:
    0 0 0 4px var(--suggest-bg),
    var(--shadow-card);
}

header,
footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

header .segmented {
  margin-left: auto;
}

blockquote {
  margin: 0;
  padding-left: 10px;
  border-left: 2px solid var(--comment-border);
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

textarea,
input {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 15px;
  line-height: 1.5;
  resize: vertical;
}

.replacement textarea {
  border-color: var(--suggest);
  background: var(--add-bg);
  font-family: var(--font-mono);
  font-size: 13px;
}

.original {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.original pre {
  margin: 0;
  padding: 9px 11px;
  border-radius: var(--radius);
  background: var(--del-bg);
  color: var(--del-text);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.hint {
  margin-right: auto;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
