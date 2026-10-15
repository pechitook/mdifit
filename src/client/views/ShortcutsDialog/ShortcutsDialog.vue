<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from '../../components/ui/Icon.vue'
import { SHORTCUTS } from '../../utils/shortcuts.ts'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => (open ? dialog.value?.showModal() : dialog.value?.close()),
  { flush: 'post' },
)
</script>

<template>
  <dialog ref="dialog" class="shortcuts" aria-labelledby="shortcuts-title" @close="emit('close')">
    <header>
      <h2 id="shortcuts-title">Keyboard shortcuts</h2>
      <button type="button" class="btn-icon" aria-label="Close" @click="emit('close')">
        <Icon name="close" :size="18" />
      </button>
    </header>
    <dl>
      <template v-for="shortcut in SHORTCUTS" :key="shortcut.action">
        <dt>
          <kbd>{{ shortcut.keys }}</kbd>
        </dt>
        <dd>{{ shortcut.label }}</dd>
      </template>
      <dt><kbd>⌘↵</kbd></dt>
      <dd>Save a comment / copy the prompt</dd>
      <dt><kbd>Shift</kbd> + click</dt>
      <dd>Comment on a range of source lines</dd>
    </dl>
  </dialog>
</template>

<style scoped>
.shortcuts {
  width: min(460px, calc(100vw - 32px));
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

h2 {
  margin: 0;
  font-size: 17px;
}

dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 10px 16px;
  margin: 0;
  padding: 18px 20px 22px;
  font-size: 14px;
}

dt {
  color: var(--text-muted);
  font-size: 13px;
}

dd {
  margin: 0;
}
</style>
