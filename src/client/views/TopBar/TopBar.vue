<script setup lang="ts">
import Icon from '../../components/ui/Icon.vue'

defineProps<{
  workspaceName: string
  /** `plans/agent-kit/release.md`, relative to where the CLI started. */
  displayPath: string | null
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

    <nav class="path" aria-label="Current file">
      <span class="path-text" :title="displayPath ?? workspaceName">{{
        displayPath ?? workspaceName
      }}</span>
      <button
        v-if="displayPath"
        type="button"
        class="btn-icon"
        aria-label="Copy file path"
        title="Copy file path"
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
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-muted);
}

.path-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
