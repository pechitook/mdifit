<script setup lang="ts">
import Icon from '../../../components/ui/Icon.vue'
import type { RenderedBlock } from '../../../utils/markdown.ts'
import DiagramBlock from './DiagramBlock.vue'

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
      <div class="gutter">
        <button
          type="button"
          class="add"
          :aria-label="`Comment on line ${block.startLine}`"
          title="Comment on this block"
          @click="emit('addAt', block)"
        >
          <Icon name="plus" :size="14" :stroke-width="2.6" />
        </button>
        <span class="line">{{ block.startLine }}</span>
      </div>
      <DiagramBlock v-if="block.diagram !== null" :source="block.diagram" :code-html="block.html" />
      <div v-else class="markdown" data-doc v-html="block.html" />
      <div class="after">
        <slot name="after" :block="block" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.block {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  border-radius: 6px;
}

.gutter {
  position: relative;
  grid-row: span 2;
  padding-right: 14px;
  text-align: right;
}

.line {
  display: block;
  padding-top: 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-faint);
  user-select: none;
}

.add {
  position: absolute;
  top: 3px;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: var(--link);
  color: #ffffff;
  opacity: 0;
}

.block:hover .add,
.add:focus-visible {
  opacity: 1;
}

.block:hover .line {
  color: var(--text);
}

.markdown {
  padding-bottom: 1em;
}

.markdown :deep(> *) {
  margin-bottom: 0;
}

.after {
  grid-column: 2;
}

.after:empty {
  display: none;
}
</style>
