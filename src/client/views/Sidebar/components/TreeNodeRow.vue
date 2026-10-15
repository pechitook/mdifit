<script setup lang="ts">
import Icon from '../../../components/ui/Icon.vue'
import type { OutlineHeading } from '../../../utils/markdown.ts'
import { formatHash } from '../../../utils/route.ts'
import type { TreeNode } from '../Sidebar.helpers.ts'

// Recursive: the template renders <TreeNodeRow> for children (Vue resolves a component by its own file name).

defineProps<{
  node: TreeNode
  depth: number
  currentPath: string | null
  collapsed: Set<string>
  /** Outline of the open file, shown under it. */
  headings: OutlineHeading[]
}>()

const emit = defineEmits<{ toggle: [path: string] }>()
</script>

<template>
  <li class="node">
    <template v-if="node.kind === 'folder'">
      <button
        type="button"
        class="row folder"
        :style="{ paddingLeft: `${8 + depth * 14}px` }"
        :aria-expanded="!collapsed.has(node.path)"
        @click="emit('toggle', node.path)"
      >
        <Icon
          :name="collapsed.has(node.path) ? 'chevron-right' : 'chevron-down'"
          :size="14"
          :stroke-width="2.4"
        />
        <span class="name">{{ node.name }}</span>
      </button>
      <ul v-if="!collapsed.has(node.path)" class="children">
        <TreeNodeRow
          v-for="child in node.children"
          :key="child.path"
          :node="child"
          :depth="depth + 1"
          :current-path="currentPath"
          :collapsed="collapsed"
          :headings="headings"
          @toggle="emit('toggle', $event)"
        />
      </ul>
    </template>

    <template v-else>
      <a
        class="row file"
        :class="{ active: node.path === currentPath, read: node.status === 'read' }"
        :href="formatHash({ path: node.path, anchor: null })"
        :style="{ paddingLeft: `${8 + depth * 14}px` }"
        :aria-current="node.path === currentPath ? 'page' : undefined"
        :title="node.title ?? node.path"
      >
        <span
          class="status"
          :class="node.status"
          :title="node.status === 'edited' ? 'Changed since you read it' : undefined"
        >
          <Icon v-if="node.status === 'read'" name="check" :size="14" :stroke-width="2.6" />
          <Icon v-else name="file" :size="15" />
        </span>
        <span class="name">{{ node.name }}</span>
        <span v-if="node.status === 'edited'" class="badge">edited</span>
        <span v-if="node.comments" class="count" :aria-label="`${node.comments} comments`">
          <Icon name="comment" :size="13" />{{ node.comments }}
        </span>
      </a>
      <ul v-if="node.path === currentPath && headings.length" class="outline" aria-label="Outline">
        <li v-for="heading in headings" :key="heading.slug">
          <a
            :href="formatHash({ path: node.path, anchor: heading.slug })"
            :style="{ paddingLeft: `${30 + depth * 14 + (heading.level - 1) * 12}px` }"
            >{{ heading.text }}</a
          >
        </li>
      </ul>
    </template>
  </li>
</template>

<style scoped>
.node,
.children,
.outline {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-height: 32px;
  padding-right: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: 14px;
  color: var(--text);
  text-align: left;
  text-decoration: none;
}

.row:hover {
  background: var(--hover);
  color: var(--text);
}

.folder {
  color: var(--text-muted);
  font-weight: 500;
}

.file.active {
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--border);
  font-weight: 600;
}

.file.read:not(.active) .name {
  color: var(--text-muted);
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  display: flex;
  flex: none;
  color: var(--text-muted);
}

.status.read {
  color: var(--suggest);
}

.badge {
  flex: none;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--suggest-bg);
  color: var(--add-text);
  font-size: 11px;
  font-weight: 600;
}

.count {
  display: flex;
  flex: none;
  align-items: center;
  gap: 3px;
  color: var(--comment-text);
  font-size: 12px;
  font-weight: 600;
}

.outline {
  margin: 2px 0 6px;
}

.outline a {
  display: block;
  padding-top: 4px;
  padding-bottom: 4px;
  padding-right: 8px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.35;
  color: var(--text-muted);
  text-decoration: none;
}

.outline a:hover {
  background: var(--hover);
  color: var(--text);
}
</style>
