<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Icon from '../../components/ui/Icon.vue'
import type { ReviewComment } from '../../stores/review.helpers.ts'
import { copyText } from '../../utils/dom.ts'
import { buildPrompt } from '../../utils/prompt.ts'
import { pluralize } from '../../utils/text.ts'

const props = defineProps<{
  open: boolean
  comments: ReviewComment[]
  currentPath: string | null
  promptBase: string
  includeQuotes: boolean
}>()

const emit = defineEmits<{
  close: []
  'update:includeQuotes': [value: boolean]
  copied: [count: number, ids: string[], clear: boolean]
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const scope = ref<'file' | 'all'>('all')
const clearAfter = ref(false)
const text = ref('')

const fileComments = computed(() => props.comments.filter((c) => c.path === props.currentPath))
const selected = computed(() => (scope.value === 'file' ? fileComments.value : props.comments))
const generated = computed(() =>
  buildPrompt(selected.value, { promptBase: props.promptBase, includeQuotes: props.includeQuotes }),
)

// The preview is editable; changing the options regenerates it.
watch(generated, (value) => (text.value = value), { immediate: true })

watch(
  () => props.open,
  (open) => {
    if (open) {
      scope.value = 'all'
      text.value = generated.value
      dialog.value?.showModal()
    } else {
      dialog.value?.close()
    }
  },
  { flush: 'post' },
)

async function copy(): Promise<void> {
  if (!text.value.trim()) return
  if (await copyText(text.value)) {
    emit(
      'copied',
      selected.value.length,
      selected.value.map((c) => c.id),
      clearAfter.value,
    )
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    void copy()
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="prompt"
    aria-labelledby="prompt-title"
    @close="emit('close')"
    @keydown="onKeydown"
  >
    <header>
      <h2 id="prompt-title">Review prompt</h2>
      <span class="summary">{{ pluralize(selected.length, 'comment') }}</span>
      <button type="button" class="btn-icon" aria-label="Close" @click="emit('close')">
        <Icon name="close" :size="18" />
      </button>
    </header>

    <div class="options">
      <div class="segmented" role="radiogroup" aria-label="Comments to include">
        <button
          type="button"
          role="radio"
          :aria-checked="scope === 'file'"
          :disabled="!currentPath"
          @click="scope = 'file'"
        >
          This file ({{ fileComments.length }})
        </button>
        <button type="button" role="radio" :aria-checked="scope === 'all'" @click="scope = 'all'">
          All files ({{ comments.length }})
        </button>
      </div>
      <label>
        <input
          type="checkbox"
          :checked="includeQuotes"
          @change="emit('update:includeQuotes', ($event.target as HTMLInputElement).checked)"
        />
        Quote the selected text
      </label>
    </div>

    <label class="preview">
      <span class="visually-hidden">Prompt</span>
      <textarea v-model="text" spellcheck="false" />
    </label>

    <footer>
      <label>
        <input v-model="clearAfter" type="checkbox" />
        Delete these comments after copying
      </label>
      <button type="button" class="btn" @click="text = generated">Reset</button>
      <button type="button" class="btn btn-comment" :disabled="!text.trim()" @click="copy">
        <Icon name="copy" />
        Copy prompt <kbd>⌘↵</kbd>
      </button>
    </footer>
  </dialog>
</template>

<style scoped>
.prompt {
  width: min(920px, calc(100vw - 32px));
}

.prompt[open] {
  display: flex;
  flex-direction: column;
}

header,
.options,
footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
}

header {
  border-bottom: 1px solid var(--border);
}

h2 {
  margin: 0;
  font-size: 18px;
}

.summary {
  margin-right: auto;
  font-size: 13px;
  color: var(--text-muted);
}

.options label,
footer label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

footer label {
  margin-right: auto;
}

.preview {
  display: flex;
  padding: 0 20px;
}

textarea {
  width: 100%;
  min-height: 380px;
  max-height: 60vh;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

footer .btn {
  min-height: 44px;
}

.btn-comment kbd {
  border-color: var(--comment-border);
  color: var(--comment-text);
}
</style>
