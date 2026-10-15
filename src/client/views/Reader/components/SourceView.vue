<script setup lang="ts">
import { computed, ref } from 'vue'
import { classifySourceLines } from '../Reader.helpers.ts'

const props = defineProps<{ lines: string[] }>()
const emit = defineEmits<{ addAt: [range: { startLine: number; endLine: number }] }>()

const kinds = computed(() => classifySourceLines(props.lines))
/** Last clicked line number: shift-click extends a range from it. */
const anchor = ref<number | null>(null)

function onLineClick(line: number, event: MouseEvent): void {
  if (event.shiftKey && anchor.value !== null) {
    emit('addAt', {
      startLine: Math.min(anchor.value, line),
      endLine: Math.max(anchor.value, line),
    })
  } else {
    emit('addAt', { startLine: line, endLine: line })
  }
  anchor.value = line
}
</script>

<template>
  <div class="source">
    <template v-for="(text, index) in lines" :key="index">
      <div
        class="src-line"
        :class="kinds[index]"
        :data-line-start="index + 1"
        :data-line-end="index + 1"
      >
        <button
          type="button"
          class="number"
          :aria-label="`Comment on line ${index + 1}`"
          title="Comment on this line (shift-click for a range)"
          @click="onLineClick(index + 1, $event)"
        >
          {{ index + 1 }}
        </button>
        <span class="text" data-doc>{{ text || ' ' }}</span>
      </div>
      <div class="after">
        <slot name="after" :line="index + 1" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.source {
  padding: 4px 0;
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 24px;
}

.src-line {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
}

.src-line:hover {
  background: var(--hover);
}

.number {
  padding: 0 14px 0 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 12px;
  color: var(--text-faint);
  text-align: right;
  user-select: none;
}

.number:hover {
  color: var(--link);
  font-weight: 600;
}

.text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.heading .text {
  color: var(--link);
  font-weight: 600;
}

.quote .text,
.meta .text {
  color: var(--text-muted);
}

.fence .text,
.code .text {
  color: var(--hl-title);
}

.list .text {
  color: var(--text);
}

.after {
  padding-left: 56px;
  font-family: var(--font-sans);
}

.after:empty {
  display: none;
}
</style>
