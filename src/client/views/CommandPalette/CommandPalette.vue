<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WorkspaceFile } from '../../../shared/api.ts'
import { search } from '../../services/api.ts'
import Icon from '../../components/ui/Icon.vue'
import { formatAge } from '../../utils/text.ts'
import { type PaletteItem, highlightParts, hitItems, matchFiles } from './CommandPalette.helpers.ts'

const props = defineProps<{ open: boolean; files: WorkspaceFile[] }>()
const emit = defineEmits<{ close: []; go: [item: PaletteItem] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const query = ref('')
const remote = ref<PaletteItem[]>([])
const active = ref(0)
const searching = ref(false)
/** Read when the palette opens, so ages do not tick while you look. */
const now = ref(Date.now())

const items = computed(() => [...matchFiles(props.files, query.value), ...remote.value])

const GROUPS = computed<{ kind: PaletteItem['kind']; label: string }[]>(() => [
  { kind: 'file', label: query.value.trim() ? 'Files' : 'Recent files' },
  { kind: 'heading', label: 'Headings' },
  { kind: 'text', label: 'Text' },
])

let controller: AbortController | null = null
let timer: ReturnType<typeof setTimeout> | undefined

watch(query, (value) => {
  active.value = 0
  clearTimeout(timer)
  controller?.abort()
  if (value.trim().length < 2) {
    remote.value = []
    searching.value = false
    return
  }
  // Pending from the first keystroke, so the list never says "Nothing found" too early.
  searching.value = true
  timer = setTimeout(async () => {
    const current = new AbortController()
    controller = current
    try {
      remote.value = hitItems((await search(value, current.signal)).hits)
    } catch {
      // Aborted by the next keystroke, or the server went away: keep file results.
    } finally {
      if (controller === current && !current.signal.aborted) searching.value = false
    }
  }, 120)
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      query.value = ''
      remote.value = []
      now.value = Date.now()
      dialog.value?.showModal()
      input.value?.focus()
    } else {
      dialog.value?.close()
    }
  },
  { flush: 'post' },
)

function indexOf(item: PaletteItem): number {
  return items.value.indexOf(item)
}

function choose(item: PaletteItem | undefined): void {
  if (item) emit('go', item)
}

function onKeydown(event: KeyboardEvent): void {
  const count = items.value.length
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = count ? (active.value + 1) % count : 0
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = count ? (active.value - 1 + count) % count : 0
  } else if (event.key === 'Enter') {
    event.preventDefault()
    choose(items.value[active.value])
  }
}

watch(active, (index) => {
  dialog.value?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
})
</script>

<template>
  <dialog
    ref="dialog"
    class="palette"
    aria-label="Go to"
    @close="emit('close')"
    @keydown="onKeydown"
  >
    <label class="field">
      <Icon name="search" :size="18" />
      <span class="visually-hidden">Search files, headings and text</span>
      <input
        ref="input"
        v-model="query"
        type="text"
        placeholder="Search files, headings and text…"
        role="combobox"
        aria-controls="palette-results"
        :aria-activedescendant="items.length ? `palette-${active}` : undefined"
        aria-expanded="true"
        autocomplete="off"
        spellcheck="false"
      />
      <kbd>Esc</kbd>
    </label>

    <div id="palette-results" class="results" role="listbox">
      <template v-for="group in GROUPS" :key="group.kind">
        <template v-if="items.some((item) => item.kind === group.kind)">
          <div class="group" role="presentation">{{ group.label }}</div>
          <button
            v-for="item in items.filter((i) => i.kind === group.kind)"
            :id="`palette-${indexOf(item)}`"
            :key="item.key"
            type="button"
            role="option"
            class="item"
            :data-index="indexOf(item)"
            :aria-selected="indexOf(item) === active"
            @mousemove="active = indexOf(item)"
            @click="choose(item)"
          >
            <Icon v-if="item.kind === 'file'" name="file" :size="15" />
            <span class="label">
              <template v-for="(part, i) in highlightParts(item.label, query)" :key="i">
                <strong v-if="part.match">{{ part.text }}</strong>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
            <span class="detail">{{ item.detail }}</span>
            <time
              v-if="item.mtimeMs !== null"
              class="age"
              :datetime="new Date(item.mtimeMs).toISOString()"
              :title="new Date(item.mtimeMs).toLocaleString()"
              >{{ formatAge(item.mtimeMs, now) }}</time
            >
          </button>
        </template>
      </template>
      <p v-if="items.length === 0" class="empty">
        {{
          query.trim().length < 2
            ? 'No Markdown files here.'
            : searching
              ? 'Searching…'
              : 'Nothing found.'
        }}
      </p>
    </div>

    <footer>
      <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
      <span><kbd>↵</kbd> open</span>
    </footer>
  </dialog>
</template>

<style scoped>
.palette {
  width: min(640px, calc(100vw - 32px));
  margin-top: 12vh;
}

.field {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
}

.field input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 17px;
}

.results {
  max-height: 55vh;
  padding: 4px 8px 10px;
  overflow-y: auto;
}

.group {
  padding: 10px 10px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: 14px;
  text-align: left;
}

.item[aria-selected='true'] {
  background: var(--hover);
}

.label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.label strong {
  font-weight: 700;
  background: var(--mark);
  border-radius: 2px;
}

.detail {
  flex: none;
  max-width: 45%;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.age {
  flex: none;
  min-width: 64px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.empty {
  margin: 0;
  padding: 18px 10px;
  font-size: 14px;
  color: var(--text-muted);
}

footer {
  display: flex;
  gap: 16px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--panel);
  font-size: 12px;
  color: var(--text-muted);
}

footer kbd + kbd {
  margin-left: 2px;
}
</style>
