<script setup lang="ts">
import Icon from '../../../components/ui/Icon.vue'
import type { RenderedBlock } from '../../../utils/markdown.ts'
import DiagramBlock from './DiagramBlock.vue'

/**
 * The rendered document, one section per top-level block. No line numbers:
 * the only affordance is a faint + in the left margin on hover.
 */
defineProps<{ blocks: RenderedBlock[] }>()
const emit = defineEmits<{ addAt: [block: RenderedBlock] }>()
</script>

<template>
  <div class="read">
    <section
      v-for="block in blocks"
      :key="block.key"
      class="block"
      :data-line-start="block.startLine"
      :data-line-end="block.endLine"
    >
      <button
        type="button"
        class="add"
        :aria-label="`Comment on line ${block.startLine}`"
        title="Comment on this block"
        @click="emit('addAt', block)"
      >
        <Icon name="plus" :size="14" :stroke-width="2.2" />
      </button>
      <DiagramBlock v-if="block.diagram !== null" :source="block.diagram" :code-html="block.html" />
      <div v-else class="markdown" data-doc v-html="block.html" />
    </section>
  </div>
</template>

<style scoped>
.block {
  position: relative;
}

.add {
  position: absolute;
  top: 4px;
  left: -42px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface);
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 120ms ease;
}

.block:hover .add,
.add:focus-visible {
  opacity: 1;
}

.add:hover {
  border-color: var(--mark-line);
  color: var(--text);
}

.markdown {
  padding-bottom: 1.1em;
}

.markdown :deep(> *) {
  margin-bottom: 0;
}

@media (max-width: 700px) {
  .add {
    display: none;
  }
}
</style>
