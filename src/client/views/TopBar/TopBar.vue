<script setup lang="ts">
import Icon from '../../components/ui/Icon.vue'
import { formatHash } from '../../utils/route.ts'
import type { Crumb } from './TopBar.helpers.ts'

defineProps<{
  crumbs: Crumb[]
  /** Path the copy button copies, relative to where the CLI started. */
  copyablePath: string | null
  mode: 'read' | 'source'
  showFiles: boolean
  showComments: boolean
  /** False in single-file mode, where there is no files panel. */
  hasFiles: boolean
  readCount: number
  fileCount: number
  commentCount: number
}>()

const emit = defineEmits<{
  'update:mode': [mode: 'read' | 'source']
  openPrompt: []
  openPalette: []
  copyPath: []
  toggleFiles: []
  toggleComments: []
}>()
</script>

<template>
  <header class="topbar">
    <button
      v-if="hasFiles"
      type="button"
      class="btn-icon panel-toggle"
      :aria-pressed="showFiles"
      :aria-label="showFiles ? 'Hide files panel' : 'Show files panel'"
      :title="`${showFiles ? 'Hide' : 'Show'} files (B)`"
      @click="emit('toggleFiles')"
    >
      <Icon name="panel-left" :size="18" />
    </button>
    <div class="brand">
      <svg width="24" height="24" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="15" fill="currentColor" />
        <rect x="13" y="16" width="28" height="4.5" rx="2.25" fill="var(--surface)" />
        <rect x="13" y="27.5" width="22" height="4.5" rx="2.25" fill="var(--surface)" />
        <rect x="13" y="34.5" width="22" height="2.5" rx="1.25" fill="var(--brand-accent)" />
        <rect
          x="13"
          y="43.5"
          width="25"
          height="4.5"
          rx="2.25"
          fill="var(--surface)"
          opacity="0.5"
        />
        <path
          d="M43 24.5h9a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3h-4.5l-3.5 3.25V37h-1a3 3 0 0 1-3-3v-6.5a3 3 0 0 1 3-3z"
          fill="var(--brand-accent)"
        />
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
      title="Review and copy the prompt (P)"
      @click="emit('openPrompt')"
    >
      <Icon name="copy" />
      Copy prompt · {{ commentCount }}
    </button>
    <button
      type="button"
      class="btn-icon panel-toggle"
      :aria-pressed="showComments"
      :aria-label="showComments ? 'Hide comments panel' : 'Show comments panel'"
      :title="`${showComments ? 'Hide' : 'Show'} comments (N)`"
      @click="emit('toggleComments')"
    >
      <Icon name="panel-right" :size="18" />
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

.panel-toggle {
  width: 36px;
  height: 36px;
}

.panel-toggle[aria-pressed='true'] {
  color: var(--text);
}

.panel-toggle[aria-pressed='false'] {
  color: var(--text-faint);
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
  background: var(--progress);
}

.btn-comment kbd {
  border-color: var(--comment-border);
  color: var(--comment-text);
}
</style>
