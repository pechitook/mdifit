<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from '../../../components/ui/Icon.vue'
import { type DiagramResult, renderDiagram } from '../../../utils/mermaid.ts'
import { useColorScheme } from '../../../utils/theme.ts'

/**
 * A ```mermaid block drawn as a diagram, with its code one click away and a
 * full-size view. Labels are selectable text, so commenting on a node works
 * like commenting on prose.
 */
const props = defineProps<{ source: string; codeHtml: string }>()

const scheme = useColorScheme()
const result = ref<DiagramResult | null>(null)
const view = ref<'diagram' | 'code'>('diagram')
const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => [props.source, scheme.value] as const,
  async ([source, theme]) => {
    const next = await renderDiagram(source, theme)
    // Ignore a slow render that finished after the source or theme changed again.
    if (source === props.source && theme === scheme.value) result.value = next
  },
  { immediate: true },
)
</script>

<template>
  <figure class="diagram">
    <div class="tools">
      <div class="segmented" role="radiogroup" aria-label="Show">
        <button
          type="button"
          role="radio"
          :aria-checked="view === 'diagram'"
          @click="view = 'diagram'"
        >
          Diagram
        </button>
        <button type="button" role="radio" :aria-checked="view === 'code'" @click="view = 'code'">
          Code
        </button>
      </div>
      <button
        v-if="result?.svg && view === 'diagram'"
        type="button"
        class="btn-icon"
        aria-label="Open the diagram full size"
        title="Full size"
        @click="dialog?.showModal()"
      >
        <Icon name="expand" />
      </button>
    </div>

    <template v-if="view === 'code' || result?.error">
      <p v-if="result?.error && view === 'diagram'" class="error" role="status">
        Mermaid: {{ result.error }}
      </p>
      <div class="markdown" data-doc v-html="codeHtml" />
    </template>
    <div v-else-if="result?.svg" class="svg" data-doc v-html="result.svg" />
    <p v-else class="loading">Drawing diagram…</p>

    <dialog ref="dialog" class="full" aria-label="Diagram" @click.self="dialog?.close()">
      <header>
        <span>Diagram</span>
        <button type="button" class="btn-icon" aria-label="Close" @click="dialog?.close()">
          <Icon name="close" :size="18" />
        </button>
      </header>
      <div v-if="result?.svg" class="svg-full" v-html="result.svg" />
    </dialog>
  </figure>
</template>

<style scoped>
.diagram {
  position: relative;
  margin: 0 0 1em;
  padding: 44px 16px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
}

.tools {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tools .segmented button {
  min-height: 26px;
  padding: 0 10px;
  font-size: 12px;
}

.svg {
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

.svg :deep(svg) {
  height: auto;
}

.markdown :deep(pre) {
  margin: 0;
}

.error {
  margin: 0 0 10px;
  color: var(--danger);
  font-size: 14px;
  font-weight: 500;
}

.loading {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.full {
  width: calc(100vw - 48px);
  max-width: none;
  height: calc(100vh - 48px);
  max-height: none;
}

.full[open] {
  display: flex;
  flex-direction: column;
}

.full header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}

.svg-full {
  flex: 1;
  padding: 24px;
  overflow: auto;
  background: var(--panel);
}

.svg-full :deep(svg) {
  display: block;
  width: auto;
  max-width: none !important;
  height: auto;
  margin: 0 auto;
}
</style>
