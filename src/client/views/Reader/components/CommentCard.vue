<script setup lang="ts">
import Icon from '../../../components/ui/Icon.vue'
import type { ReviewComment } from '../../../stores/review.helpers.ts'
import { formatLocation } from '../../../utils/prompt.ts'

defineProps<{ comment: ReviewComment; promptBase: string }>()
const emit = defineEmits<{ edit: []; remove: []; copy: [] }>()
</script>

<template>
  <article
    :id="`comment-${comment.id}`"
    class="card"
    :class="{ suggestion: comment.suggestion !== null }"
  >
    <header>
      <span v-if="comment.suggestion !== null" class="kind">Suggested edit</span>
      <code class="ref">{{ formatLocation(comment, promptBase) }}</code>
      <span class="actions">
        <button type="button" class="btn btn-small" @click="emit('copy')">Copy prompt</button>
        <button
          type="button"
          class="btn-icon"
          aria-label="Edit comment"
          title="Edit"
          @click="emit('edit')"
        >
          <Icon name="edit" :size="15" />
        </button>
        <button
          type="button"
          class="btn-icon"
          aria-label="Delete comment"
          title="Delete"
          @click="emit('remove')"
        >
          <Icon name="trash" :size="15" />
        </button>
      </span>
    </header>

    <div v-if="comment.suggestion !== null" class="diff">
      <pre class="del">{{ comment.quote }}</pre>
      <pre class="add">{{ comment.suggestion }}</pre>
    </div>
    <blockquote v-else-if="comment.quote">{{ comment.quote }}</blockquote>

    <p v-if="comment.body">{{ comment.body }}</p>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0 16px;
  padding: 12px 14px;
  border: 1px solid var(--comment-border);
  border-radius: 10px;
  background: var(--comment-bg);
  box-shadow: var(--shadow-card);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.55;
}

.card.suggestion {
  border-color: var(--suggest);
}

header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.kind {
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--suggest);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.btn-small {
  min-height: 30px;
  padding: 0 10px;
  border-color: var(--comment-border);
  font-size: 12px;
  color: var(--comment-text);
}

blockquote {
  margin: 0;
  padding-left: 10px;
  border-left: 2px solid var(--comment-border);
  color: var(--text-muted);
  font-size: 14px;
  white-space: pre-wrap;
}

p {
  margin: 0;
  white-space: pre-wrap;
}

.diff {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.diff pre {
  margin: 0;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.del {
  background: var(--del-bg);
  color: var(--del-text);
  text-decoration: line-through;
  text-decoration-color: color-mix(in srgb, var(--del-text) 50%, transparent);
}

.add {
  background: var(--add-bg);
  color: var(--add-text);
}
</style>
