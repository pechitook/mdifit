<script setup lang="ts">
import Icon from '../../../components/ui/Icon.vue'
import { formatHash } from '../../../utils/route.ts'
import { formatAge, pluralize } from '../../../utils/text.ts'
import type { FolderListing } from '../Folder.helpers.ts'

defineProps<{ listing: FolderListing; now: number }>()
</script>

<template>
  <ul class="list">
    <li v-for="folder in listing.folders" :key="folder.path">
      <a class="row" :href="formatHash({ path: folder.path, anchor: null })">
        <Icon name="folder" class="icon" />
        <span class="name">{{ folder.name }}</span>
        <span class="meta">
          {{ pluralize(folder.files, 'file') }}
          <template v-if="folder.unread"> · {{ folder.unread }} unread</template>
        </span>
        <span v-if="folder.comments" class="count" :aria-label="`${folder.comments} comments`">
          <Icon name="comment" :size="13" />{{ folder.comments }}
        </span>
      </a>
    </li>
    <li v-for="file in listing.files" :key="file.path">
      <a class="row" :class="file.status" :href="formatHash({ path: file.path, anchor: null })">
        <Icon :name="file.status === 'read' ? 'check' : 'file'" class="icon status" />
        <span class="name">
          {{ file.name }}
          <span v-if="file.title" class="title">{{ file.title }}</span>
        </span>
        <span v-if="file.status === 'edited'" class="badge">edited</span>
        <span class="meta">{{ formatAge(file.mtimeMs, now) }}</span>
        <span v-if="file.comments" class="count" :aria-label="`${file.comments} comments`">
          <Icon name="comment" :size="13" />{{ file.comments }}
        </span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 6px 12px;
  border-top: 1px solid var(--border);
  color: var(--text);
  font-size: 14px;
  text-decoration: none;
}

li:first-child .row {
  border-top: 0;
}

.row:hover {
  background: var(--hover);
  color: var(--text);
}

.icon {
  flex: none;
  color: var(--text-muted);
}

.read .status {
  color: var(--suggest);
}

.read .name {
  color: var(--text-muted);
}

.name {
  display: flex;
  flex: 1;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.title {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 13px;
  text-overflow: ellipsis;
}

.meta {
  flex: none;
  color: var(--text-muted);
  font-size: 12px;
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
</style>
