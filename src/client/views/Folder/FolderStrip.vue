<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '../../components/ui/Icon.vue'
import { pluralize } from '../../utils/text.ts'
import { type FolderListing, folderName } from './Folder.helpers.ts'
import FolderList from './components/FolderList.vue'

/**
 * Shown above the README a folder opened with: the folder's contents, folded by
 * default, and a switch when the folder has more than one entry file.
 */
const props = defineProps<{
  folder: string
  rootName: string
  listing: FolderListing
  entries: string[]
  entry: string
}>()
const emit = defineEmits<{ chooseEntry: [path: string] }>()

const open = ref(false)
const now = ref(Date.now())
const summary = computed(() => {
  const parts = [pluralize(props.listing.files.length, 'file')]
  if (props.listing.folders.length) parts.push(pluralize(props.listing.folders.length, 'folder'))
  return `${parts.join(' · ')} in ${folderName(props.folder, props.rootName)}`
})

function toggle(): void {
  open.value = !open.value
  now.value = Date.now()
}

function entryName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}
</script>

<template>
  <section class="strip" aria-label="Folder">
    <header>
      <button type="button" class="toggle" :aria-expanded="open" @click="toggle">
        <Icon :name="open ? 'chevron-down' : 'chevron-right'" :size="14" :stroke-width="2.4" />
        <Icon name="folder" :size="15" />
        {{ summary }}
      </button>
      <div v-if="entries.length > 1" class="segmented" role="radiogroup" aria-label="Open with">
        <button
          v-for="path in entries"
          :key="path"
          type="button"
          role="radio"
          :aria-checked="path === entry"
          @click="emit('chooseEntry', path)"
        >
          {{ entryName(path) }}
        </button>
      </div>
    </header>
    <FolderList v-if="open" :listing="listing" :now="now" class="list" />
  </section>
</template>

<style scoped>
.strip {
  margin-bottom: 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
  font-family: var(--font-sans);
}

header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 4px;
}

.toggle {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.toggle:hover {
  background: var(--hover);
  color: var(--text);
}

.list {
  border-top: 1px solid var(--border);
  background: var(--surface);
  border-radius: 0 0 var(--radius) var(--radius);
}
</style>
