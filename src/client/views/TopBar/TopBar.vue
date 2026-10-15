<script setup lang="ts">
import Icon from '../../components/ui/Icon.vue'
import { formatHash } from '../../utils/route.ts'
import type { Crumb } from './TopBar.helpers.ts'

defineProps<{
  crumbs: Crumb[]
  /** Path the copy button copies, relative to where the CLI started. */
  copyablePath: string | null
  mode: 'read' | 'source'
  readCount: number
  fileCount: number
  commentCount: number
}>()

const emit = defineEmits<{
  'update:mode': [mode: 'read' | 'source']
  openPrompt: []
  openPalette: []
  copyPath: []
}>()
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M7 15V9l2.5 3L12 9v6" />
        <path d="M15 9v6l2-2M17 13l2 2" />
      </svg>
      mdifit
    </div>

    <nav class="path" aria-label="Breadcrumb">
      <ol>
        <li v-for="crumb in crumbs" :key="crumb.path">
          <span v-if="crumb.current" class="crumb current" aria-current="page" :title="crumb.label">
            {{ crumb.label }}
          </span>
          <template v-else>
            <a
              class="crumb"
              :href="formatHash({ path: crumb.path, anchor: null })"
              :title="crumb.label"
            >
              {{ crumb.label }}
            </a>
            <Icon name="chevron-right" :size="14" class="sep" />
          </template>
        </li>
      </ol>
      <button
        v-if="copyablePath"
        type="button"
        class="btn-icon"
        :aria-label="`Copy path ${copyablePath}`"
        :title="`Copy ${copyablePath}`"
        @click="emit('copyPath')"
      >
        <Icon name="copy" />
      </button>
    </nav>

    <div class="segmented" role="group" aria-label="View">
      <button type="button" :aria-pressed="mode === 'read'" @click="emit('update:mode', 'read')">
        Read
      </button>
      <button
        type="button"
        :aria-pressed="mode === 'source'"
        @click="emit('update:mode', 'source')"
      >
        Source
      </button>
    </div>

    <div class="progress">
      <span>{{ readCount }} / {{ fileCount }} read</span>
      <span class="bar" aria-hidden="true">
        <span :style="{ width: `${fileCount ? (readCount / fileCount) * 100 : 0}%` }" />
      </span>
    </div>

    <button
      type="button"
      class="btn"
      title="Search files, headings and text"
      @click="emit('openPalette')"
    >
      <Icon name="search" />
      Search
      <kbd>⌘K</kbd>
    </button>

    <button
      type="button"
      class="btn btn-comment"
      :disabled="commentCount === 0"
      @click="emit('openPrompt')"
    >
      <Icon name="copy" />
      Copy all prompt ({{ commentCount }})
      <kbd>P</kbd>
    </button>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.path {
  display: flex;
  flex: 1 1 240px;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 14px;
  color: var(--text-muted);
}

ol {
  display: flex;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  min-width: 0;
}

/* Earlier crumbs give up space first, so the file name stays readable. */
li:not(:last-child) {
  flex-shrink: 3;
}

.crumb {
  overflow: hidden;
  padding: 3px 4px;
  border-radius: 4px;
  color: var(--text-muted);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

a.crumb:hover {
  background: var(--hover);
  color: var(--text);
}

.crumb.current {
  color: var(--text);
  font-weight: 600;
}

.sep {
  flex: none;
  color: var(--text-faint);
}

.progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 110px;
  font-size: 12px;
  color: var(--text-muted);
}

.bar {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: var(--sunken);
}

.bar span {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: var(--suggest);
}

.btn-comment kbd {
  border-color: var(--comment-border);
  color: var(--comment-text);
}
</style>
