<script setup lang="ts">
import { ref, watch } from 'vue'
import Icon from '../../../components/ui/Icon.vue'
import type { ReviewComment } from '../../../stores/review.helpers.ts'
import { formatAge } from '../../../utils/text.ts'
import { type PopoverPlacement, linesLabel } from '../Reader.helpers.ts'

/** A saved comment, opened from its bubble. Previous / next walk the file's comments. */
const props = defineProps<{
  comment: ReviewComment
  placement: PopoverPlacement
  index: number
  total: number
}>()
const emit = defineEmits<{ previous: []; next: []; copy: []; edit: []; remove: [] }>()

const root = ref<HTMLElement | null>(null)

// Keep the opened comment on screen, also when it opens under a line near the bottom.
watch(
  () => props.placement,
  () => root.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
  { flush: 'post', immediate: true },
)
</script>

<template>
  <section
    :id="`comment-${comment.id}`"
    ref="root"
    class="margin-pop"
    :class="placement.side"
    :style="{ top: `${placement.top}px`, left: `${placement.left}px` }"
    :aria-label="`Comment on ${linesLabel(comment).toLowerCase()}`"
  >
    <div class="top">
      <span>{{ linesLabel(comment) }} · {{ formatAge(comment.createdAt, Date.now()) }}</span>
      <div v-if="total > 1" class="nav">
        <button type="button" class="mini" aria-label="Previous comment" @click="emit('previous')">
          <Icon name="chevron-left" :size="15" :stroke-width="2.2" />
        </button>
        <span>{{ index + 1 }} / {{ total }}</span>
        <button type="button" class="mini" aria-label="Next comment" @click="emit('next')">
          <Icon name="chevron-right" :size="15" :stroke-width="2.2" />
        </button>
      </div>
    </div>

    <div v-if="comment.suggestion !== null" class="diff">
      <del>{{ comment.quote }}</del>
      <ins>{{ comment.suggestion }}</ins>
    </div>
    <p v-if="comment.body" class="body">{{ comment.body }}</p>

    <div class="actions">
      <button type="button" class="text-btn" @click="emit('copy')">
        <Icon name="copy" :size="15" />
        Copy prompt
      </button>
      <span class="spacer" />
      <button
        type="button"
        class="mini"
        aria-label="Edit comment"
        title="Edit"
        @click="emit('edit')"
      >
        <Icon name="edit" :size="15" />
      </button>
      <button
        type="button"
        class="mini"
        aria-label="Delete comment"
        title="Delete"
        @click="emit('remove')"
      >
        <Icon name="trash" :size="15" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
}

.mini:hover {
  background: var(--hover);
  color: var(--text);
}

.body {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.diff {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  line-height: 1.5;
}

.diff del,
.diff ins {
  padding: 2px 6px;
  border-radius: 4px;
  white-space: pre-wrap;
}

.diff del {
  background: var(--del-bg);
  color: var(--del-text);
}

.diff ins {
  background: var(--add-bg);
  color: var(--add-text);
  text-decoration: none;
}

.actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.spacer {
  flex: 1;
}

.text-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.text-btn:hover {
  background: var(--hover);
}
</style>
