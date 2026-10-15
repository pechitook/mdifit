<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../../../components/ui/Icon.vue'

/** A quiet pill over the selection. Shortcuts live in the tooltips. */
const props = defineProps<{ rect: DOMRect }>()
const emit = defineEmits<{ comment: []; suggest: []; copyRef: [] }>()

const TOOLBAR_HEIGHT = 44
const position = computed(() => {
  const above = props.rect.top - TOOLBAR_HEIGHT - 8
  const top = above > 8 ? above : props.rect.bottom + 8
  const left = Math.min(
    Math.max(props.rect.left + props.rect.width / 2, 130),
    window.innerWidth - 130,
  )
  return { top: `${top}px`, left: `${left}px` }
})
</script>

<template>
  <div class="toolbar" role="toolbar" aria-label="Selection" :style="position" @mousedown.prevent>
    <button type="button" title="Comment (C)" @click="emit('comment')">
      <Icon name="comment" :size="16" />Comment
    </button>
    <button type="button" title="Suggest an edit (S)" @click="emit('suggest')">
      <Icon name="edit" :size="16" />Suggest
    </button>
    <button
      type="button"
      aria-label="Copy reference"
      title="Copy reference"
      @click="emit('copyRef')"
    >
      <Icon name="link" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  position: fixed;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 8px 24px rgb(20 20 20 / 0.1);
  transform: translateX(-50%);
  white-space: nowrap;
}

button {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

button:hover {
  background: var(--hover);
}
</style>
