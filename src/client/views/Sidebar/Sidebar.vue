<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { WorkspaceFile } from '../../../shared/api.ts'
import Icon from '../../components/ui/Icon.vue'
import type { OutlineHeading } from '../../utils/markdown.ts'
import { type FileFilter, buildTree, filterCounts } from './Sidebar.helpers.ts'
import TreeNodeRow from './components/TreeNodeRow.vue'

const props = defineProps<{
  files: WorkspaceFile[]
  read: Record<string, number>
  commentCounts: Map<string, number>
  currentPath: string | null
  headings: OutlineHeading[]
}>()

const filter = ref<FileFilter>('all')
const query = ref('')
const collapsed = reactive(new Set<string>())

const tree = computed(() =>
  buildTree({
    files: props.files,
    read: props.read,
    commentCounts: props.commentCounts,
    filter: filter.value,
    query: query.value,
  }),
)
const counts = computed(() => filterCounts(props.files, props.read, props.commentCounts))

const FILTERS: { value: FileFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'commented', label: 'Commented' },
]

function toggle(path: string): void {
  if (collapsed.has(path)) collapsed.delete(path)
  else collapsed.add(path)
}
</script>

<template>
  <aside class="sidebar" aria-label="Files">
    <div class="search">
      <label class="field">
        <Icon name="search" />
        <span class="visually-hidden">Filter files</span>
        <input v-model="query" type="search" placeholder="Filter files…" />
      </label>
    </div>

    <div class="filters" role="radiogroup" aria-label="Show">
      <button
        v-for="option in FILTERS"
        :key="option.value"
        type="button"
        role="radio"
        :aria-checked="filter === option.value"
        @click="filter = option.value"
      >
        {{ option.label }} <span>{{ counts[option.value] }}</span>
      </button>
    </div>

    <ul v-if="tree.length" class="tree">
      <TreeNodeRow
        v-for="node in tree"
        :key="node.path"
        :node="node"
        :depth="0"
        :current-path="currentPath"
        :collapsed="collapsed"
        :headings="headings"
        @toggle="toggle"
      />
    </ul>
    <p v-else class="empty">
      {{ files.length === 0 ? 'No Markdown files here.' : 'No files match.' }}
    </p>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 14px 10px;
  overflow-y: auto;
  border-right: 1px solid var(--border);
  background: var(--panel);
}

.search {
  display: flex;
  gap: 4px;
  align-items: center;
}

.field {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-muted);
}

.field input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 14px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filters button {
  padding: 4px 10px;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--surface);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}

.filters button span {
  margin-left: 2px;
  opacity: 0.8;
}

.filters button[aria-checked='true'] {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-text);
}

.tree {
  margin: 0;
  padding: 0;
  list-style: none;
}

.empty {
  margin: 8px;
  font-size: 14px;
  color: var(--text-muted);
}
</style>
