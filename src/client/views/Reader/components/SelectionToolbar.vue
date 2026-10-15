<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../../../components/ui/Icon.vue'

const props = defineProps<{ rect: DOMRect }>()
const emit = defineEmits<{ comment: []; suggest: []; copyRef: [] }>()

const TOOLBAR_HEIGHT = 44
const position = computed(() => {
  const above = props.rect.top - TOOLBAR_HEIGHT - 8
  const top = above > 8 ? above : props.rect.bottom + 8
  const left = Math.min(
    Math.max(props.rect.left + props.rect.width / 2, 170),
    window.innerWidth - 170,
  )
  return { top: `${top}px`, left: `${left}px` }
})
</script>

<template>
  <div class="toolbar" role="toolbar" aria-label="Selection" :style="position" @mousedown.prevent>
    <button type="button" @click="emit('comment')">
      <Icon name="comment" :size="15" />Comment <kbd>C</kbd>
    </button>
    <button type="button" @click="emit('suggest')">
      <Icon name="edit" :size="15" />Suggest edit <kbd>S</kbd>
    </button>
    <span class="divider" aria-hidden="true" />
    <button type="button" @click="emit('copyRef')"><Icon name="link" :size="15" />Copy ref</button>
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
  border-radius: 10px;
  background: #1e2023;
  box-shadow: var(--shadow-pop);
  transform: translateX(-50%);
  white-space: nowrap;
}

button {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
}

button:hover {
  background: #33363b;
}

kbd {
  border-color: #4a4d53;
  color: #b9bcc2;
}

.divider {
  width: 1px;
  height: 22px;
  margin: 0 4px;
  background: #3f4247;
}
</style>
