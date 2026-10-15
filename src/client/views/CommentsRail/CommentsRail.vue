<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '../../components/ui/Icon.vue'
import { type ReviewComment, sortComments } from '../../stores/review.helpers.ts'
import { formatHash } from '../../utils/route.ts'

const props = defineProps<{ comments: ReviewComment[]; currentPath: string | null }>()
const emit = defineEmits<{ openPrompt: []; clear: [ids: string[]] }>()

const scope = ref<'file' | 'all'>('file')

const fileComments = computed(() => props.comments.filter((c) => c.path === props.currentPath))
const shown = computed(() =>
  sortComments(scope.value === 'file' ? fileComments.value : props.comments),
)

function lines(comment: ReviewComment): string {
  return comment.startLine === comment.endLine
    ? `L${comment.startLine}`
    : `L${comment.startLine}-L${comment.endLine}`
}

function clear(): void {
  const ids = shown.value.map((c) => c.id)
  const what = scope.value === 'file' ? 'in this file' : 'in every file'
  if (ids.length && window.confirm(`Delete ${ids.length} comments ${what}?`)) emit('clear', ids)
}
</script>

<template>
  <aside class="rail" aria-label="Comments">
    <div class="tabs" role="tablist">
      <button type="button" role="tab" :aria-selected="scope === 'file'" @click="scope = 'file'">
        This file <span>{{ fileComments.length }}</span>
      </button>
      <button type="button" role="tab" :aria-selected="scope === 'all'" @click="scope = 'all'">
        All files <span>{{ comments.length }}</span>
      </button>
    </div>

    <ol v-if="shown.length" class="list">
      <li v-for="comment in shown" :key="comment.id">
        <a :href="formatHash({ path: comment.path, anchor: `comment-${comment.id}` })" class="item">
          <span class="meta">
            <span v-if="comment.suggestion !== null" class="kind">Suggested edit</span>
            <code>{{ scope === 'all' ? `${comment.path}:` : '' }}{{ lines(comment) }}</code>
          </span>
          <span v-if="comment.quote" class="quote">“{{ comment.quote }}”</span>
          <span v-if="comment.suggestion !== null" class="suggestion"
            >→ {{ comment.suggestion }}</span
          >
          <span v-if="comment.body" class="body">{{ comment.body }}</span>
        </a>
      </li>
    </ol>
    <div v-else class="empty">
      <Icon name="comment" :size="20" />
      <p v-if="scope === 'file'">
        Select text to comment on it, or click a line number. Your comments stay in this browser.
      </p>
      <p v-else>No comments yet.</p>
    </div>

    <footer>
      <button
        type="button"
        class="btn btn-comment"
        :disabled="comments.length === 0"
        @click="emit('openPrompt')"
      >
        <Icon name="copy" />
        Copy all prompt
      </button>
      <button type="button" class="btn" :disabled="shown.length === 0" @click="clear">Clear</button>
    </footer>
  </aside>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-left: 1px solid var(--border);
  background: var(--panel);
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 10px 12px 0;
  border-bottom: 1px solid var(--border);
}

.tabs button {
  padding: 8px 10px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
}

.tabs button[aria-selected='true'] {
  border-bottom-color: var(--text);
  color: var(--text);
  font-weight: 600;
}

.list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 12px;
  overflow-y: auto;
  list-style: none;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  line-height: 1.45;
  text-decoration: none;
}

.item:hover {
  border-color: var(--comment-border);
  color: var(--text);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.meta code {
  font-size: 12px;
  font-weight: 500;
  color: var(--comment-text);
  word-break: break-all;
}

.kind {
  padding: 0 6px;
  border-radius: 4px;
  background: var(--suggest);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
}

.quote,
.suggestion,
.body {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.quote {
  font-size: 13px;
  color: var(--text-muted);
}

.suggestion {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--add-text);
}

.empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 24px;
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
}

.empty p {
  margin: 0;
}

footer {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border);
}

footer .btn-comment {
  flex: 1;
  justify-content: center;
  min-height: 44px;
}

footer .btn:not(.btn-comment) {
  min-height: 44px;
}
</style>
