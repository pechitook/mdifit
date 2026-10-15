<script setup lang="ts">
import Icon from '../../components/ui/Icon.vue'
import { pluralize } from '../../utils/text.ts'
import { type FolderListing, folderName } from './Folder.helpers.ts'
import FolderList from './components/FolderList.vue'

/** A folder without a README: its contents, and a hint about how folders open. */
defineProps<{ folder: string; rootName: string; listing: FolderListing }>()
const now = Date.now()
</script>

<template>
  <main class="folder">
    <div class="page">
      <header>
        <Icon name="folder" :size="22" />
        <h1>{{ folderName(folder, rootName) }}</h1>
        <span class="summary">
          {{ pluralize(listing.files.length, 'file') }}
          <template v-if="listing.folders.length">
            · {{ pluralize(listing.folders.length, 'folder') }}
          </template>
        </span>
      </header>

      <FolderList
        v-if="listing.files.length || listing.folders.length"
        :listing="listing"
        :now="now"
        class="list"
      />

      <p class="hint">
        No <code>README.md</code> or <code>AGENTS.md</code> here. Add one and this folder opens with
        it.
      </p>
    </div>
  </main>
</template>

<style scoped>
.folder {
  height: 100%;
  overflow-y: auto;
  background: var(--surface);
}

.page {
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 32px 80px;
}

header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  color: var(--text-muted);
}

h1 {
  margin: 0;
  color: var(--text);
  font-size: 28px;
  letter-spacing: -0.01em;
}

.summary {
  margin-left: auto;
  font-size: 14px;
}

.list {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.hint {
  margin: 20px 0 0;
  color: var(--text-muted);
  font-size: 14px;
}
</style>
