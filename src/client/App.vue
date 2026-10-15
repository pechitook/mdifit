<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { FileResponse, WorkspaceResponse } from '../shared/api.ts'
import { adjacentPath, nextUnreadPath, readCount } from './App.helpers.ts'
import { ApiError, getFile, getWorkspace, subscribeChanges } from './services/api.ts'
import {
  type Prefs,
  type ReviewStore,
  createReviewStore,
  loadPrefs,
  savePrefs,
} from './stores/review.ts'
import { countByPath, readStatus } from './stores/review.helpers.ts'
import { copyText, isEditingTarget } from './utils/dom.ts'
import { renderMarkdown } from './utils/markdown.ts'
import { type Route, folderOf, formatHash, isFolderPath, parseHash } from './utils/route.ts'
import { matchShortcut } from './utils/shortcuts.ts'
import { pluralize } from './utils/text.ts'
import type { PaletteItem } from './views/CommandPalette/CommandPalette.helpers.ts'
import CommandPalette from './views/CommandPalette/CommandPalette.vue'
import CommentsRail from './views/CommentsRail/CommentsRail.vue'
import { folderEntries, folderExists, listFolder } from './views/Folder/Folder.helpers.ts'
import FolderStrip from './views/Folder/FolderStrip.vue'
import FolderView from './views/Folder/FolderView.vue'
import PromptDialog from './views/PromptDialog/PromptDialog.vue'
import Reader from './views/Reader/Reader.vue'
import ShortcutsDialog from './views/ShortcutsDialog/ShortcutsDialog.vue'
import { buildTree, flattenFiles } from './views/Sidebar/Sidebar.helpers.ts'
import Sidebar from './views/Sidebar/Sidebar.vue'
import { type Crumb, breadcrumbs } from './views/TopBar/TopBar.helpers.ts'
import TopBar from './views/TopBar/TopBar.vue'

/**
 * The shell: loads the workspace, routes through the hash, owns the review
 * store and the dialogs, and wires keyboard shortcuts. Screens render; the
 * rules live in the helpers next to them.
 */

const workspace = shallowRef<WorkspaceResponse | null>(null)
const store = shallowRef<ReviewStore | null>(null)
const file = shallowRef<FileResponse | null>(null)
const route = ref<Route>(parseHash(location.hash))
const prefs = ref<Prefs>(loadPrefs())
const error = ref<string | null>(null)
const fileError = ref<string | null>(null)
const toast = ref<string | null>(null)
const dialog = ref<'prompt' | 'palette' | 'help' | null>(null)
const reader = ref<InstanceType<typeof Reader> | null>(null)
/** Folder → entry file picked by hand when a folder has README and AGENTS. */
const entryChoice = ref<Record<string, string>>({})

const files = computed(() => workspace.value?.files ?? [])
const promptBase = computed(() => workspace.value?.promptBase ?? '')
const showFilesPanel = computed(() => prefs.value.showFiles && !workspace.value?.single)
const comments = computed(() => store.value?.state.comments ?? [])
const read = computed(() => store.value?.state.read ?? {})
const commentCounts = computed(() => countByPath(comments.value))
const treeOrder = computed(() =>
  flattenFiles(
    buildTree({ files: files.value, read: {}, commentCounts: new Map(), filter: 'all', query: '' }),
  ).map((node) => node.path),
)
/** The folder route on screen (`plans/`, root `''`), or `null` on a file route. */
const folder = computed(() => (isFolderPath(route.value.path) ? route.value.path : null))
const entries = computed(() =>
  folder.value === null ? [] : folderEntries(files.value, folder.value),
)
/** The file on screen: the routed file, or the README / AGENTS.md a folder opens with. */
const viewPath = computed(() => {
  if (folder.value === null) return route.value.path
  const chosen = entryChoice.value[folder.value]
  return chosen && entries.value.includes(chosen) ? chosen : (entries.value[0] ?? null)
})
const listing = computed(() =>
  folder.value === null
    ? null
    : listFolder(files.value, folder.value, read.value, commentCounts.value),
)
const crumbs = computed<Crumb[]>(() => {
  const name = workspace.value?.name ?? ''
  if (workspace.value?.single) return [{ label: name, path: viewPath.value ?? '', current: true }]
  return breadcrumbs(name, folder.value, viewPath.value)
})
const copyablePath = computed(() => {
  const path = viewPath.value ?? folder.value
  return path === null ? null : `${promptBase.value}${path}` || './'
})
const currentFile = computed(() => files.value.find((f) => f.path === viewPath.value) ?? null)
const rendered = computed(() =>
  file.value ? renderMarkdown(file.value.source, file.value.path) : null,
)
const fileComments = computed(() => comments.value.filter((c) => c.path === file.value?.path))
const status = computed(() =>
  currentFile.value ? readStatus(currentFile.value, read.value) : 'unread',
)
const nextPath = computed(() =>
  nextUnreadPath(treeOrder.value, files.value, read.value, viewPath.value),
)

watch(prefs, savePrefs, { deep: true })

// --- loading -----------------------------------------------------------------

async function loadWorkspace(): Promise<void> {
  try {
    const next = await getWorkspace()
    if (!store.value || workspace.value?.rootPath !== next.rootPath)
      store.value = createReviewStore(next.rootPath)
    workspace.value = next
    error.value = null
    redirectIfMissing(next)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : String(e)
  }
}

/** Sends a route that points nowhere to the closest folder that exists. */
function redirectIfMissing(next: WorkspaceResponse): void {
  const path = route.value.path
  if (next.single) {
    const only = next.files[0]?.path
    if (only && path !== only) navigate({ path: only, anchor: null }, true)
    return
  }
  if (path === null) {
    navigate({ path: '', anchor: null }, true)
    return
  }
  const exists = isFolderPath(path)
    ? folderExists(next.files, path)
    : next.files.some((f) => f.path === path)
  if (exists) return
  const parent = isFolderPath(path) ? '' : folderOf(path)
  navigate({ path: folderExists(next.files, parent) ? parent : '', anchor: null }, true)
}

let loadToken = 0
async function loadFile(path: string): Promise<void> {
  const token = ++loadToken
  try {
    const next = await getFile(path)
    if (token !== loadToken) return
    file.value = next
    fileError.value = null
    document.title = `${path} · mdifit`
  } catch (e) {
    if (token !== loadToken) return
    fileError.value = e instanceof ApiError ? e.message : String(e)
  }
}

watch(
  viewPath,
  (path) => {
    if (path) void loadFile(path)
    else {
      file.value = null
      fileError.value = null
      document.title = `${folder.value || workspace.value?.name || ''} · mdifit`
    }
  },
  { immediate: true },
)

function navigate(next: Route, replace = false): void {
  const hash = formatHash(next)
  if (replace) history.replaceState(null, '', hash)
  else if (location.hash !== hash) location.hash = hash
  route.value = next
}

function onHashChange(): void {
  route.value = parseHash(location.hash)
  if (workspace.value) redirectIfMissing(workspace.value)
}

// --- review actions ----------------------------------------------------------

function toggleRead(): void {
  const current = currentFile.value
  if (!current || !store.value) return
  if (status.value === 'read') store.value.markUnread(current.path)
  else store.value.markRead(current)
}

function onCopied(count: number, ids: string[], clear: boolean): void {
  if (clear) store.value?.clearComments(ids)
  dialog.value = null
  showToast(`Copied ${pluralize(count, 'comment')}${clear ? ' and deleted them' : ''}`)
}

async function copyPath(): Promise<void> {
  if (copyablePath.value && (await copyText(copyablePath.value))) showToast('Path copied')
}

function chooseEntry(path: string): void {
  if (folder.value !== null) entryChoice.value = { ...entryChoice.value, [folder.value]: path }
}

function go(item: PaletteItem): void {
  dialog.value = null
  navigate({ path: item.path, anchor: item.line ? `L${item.line}` : null })
}

let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(message: string): void {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 2200)
}

// --- keyboard ----------------------------------------------------------------

function onKeydown(event: KeyboardEvent): void {
  const action = matchShortcut({
    key: event.key,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    editing: isEditingTarget(event.target),
  })
  if (!action) return
  if (dialog.value && action !== 'palette') return

  event.preventDefault()
  switch (action) {
    case 'palette':
      dialog.value = dialog.value === 'palette' ? null : 'palette'
      break
    case 'comment':
    case 'suggest':
      if (!reader.value?.startFromSelection(action)) showToast('Select some text first')
      break
    case 'prompt':
      if (comments.value.length) dialog.value = 'prompt'
      else showToast('No comments yet')
      break
    case 'toggleRead':
      toggleRead()
      break
    case 'toggleMode':
      prefs.value.mode = prefs.value.mode === 'read' ? 'source' : 'read'
      break
    case 'nextFile':
    case 'previousFile': {
      const path = adjacentPath(treeOrder.value, viewPath.value, action === 'nextFile' ? 1 : -1)
      if (path) navigate({ path, anchor: null })
      break
    }
    case 'toggleFiles':
      if (!workspace.value?.single) prefs.value.showFiles = !prefs.value.showFiles
      break
    case 'toggleComments':
      prefs.value.showComments = !prefs.value.showComments
      break
    case 'help':
      dialog.value = 'help'
      break
  }
}

// --- live reload -------------------------------------------------------------

let unsubscribe: (() => void) | null = null

onMounted(() => {
  window.addEventListener('hashchange', onHashChange)
  window.addEventListener('keydown', onKeydown)
  void loadWorkspace()
  unsubscribe = subscribeChanges((path) => {
    void loadWorkspace()
    if (path === viewPath.value) void loadFile(path)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange)
  window.removeEventListener('keydown', onKeydown)
  unsubscribe?.()
})
</script>

<template>
  <div v-if="error" class="fatal" role="alert">
    <h1>mdifit</h1>
    <p>{{ error }}</p>
    <button type="button" class="btn btn-primary" @click="loadWorkspace">Try again</button>
  </div>

  <div v-else-if="workspace && store" class="shell">
    <TopBar
      v-model:mode="prefs.mode"
      :show-files="prefs.showFiles"
      :show-comments="prefs.showComments"
      :has-files="!workspace.single"
      :crumbs="crumbs"
      :copyable-path="copyablePath"
      :read-count="readCount(files, read)"
      :file-count="files.length"
      :comment-count="comments.length"
      @open-prompt="dialog = 'prompt'"
      @open-palette="dialog = 'palette'"
      @copy-path="copyPath"
      @toggle-files="prefs.showFiles = !prefs.showFiles"
      @toggle-comments="prefs.showComments = !prefs.showComments"
    />

    <div class="body" :class="{ 'no-files': !showFilesPanel, 'no-comments': !prefs.showComments }">
      <Sidebar
        v-if="showFilesPanel"
        :files="files"
        :read="read"
        :comment-counts="commentCounts"
        :current-path="viewPath"
        :current-folder="folder"
        :headings="rendered?.headings ?? []"
      />

      <Reader
        v-if="file && rendered && file.path === viewPath"
        ref="reader"
        :file="file"
        :rendered="rendered"
        :comments="fileComments"
        :prompt-base="promptBase"
        :mode="prefs.mode"
        :anchor="route.anchor"
        :status="status"
        :next-path="nextPath"
        @add="store.addComment($event)"
        @update="(id, input) => store?.updateComment(id, input)"
        @remove="store.removeComment($event)"
        @toggle-read="toggleRead"
        @toast="showToast"
      >
        <template v-if="folder !== null && listing" #before>
          <FolderStrip
            :folder="folder"
            :root-name="workspace.name"
            :listing="listing"
            :entries="entries"
            :entry="file.path"
            @choose-entry="chooseEntry"
          />
        </template>
      </Reader>
      <FolderView
        v-else-if="folder !== null && viewPath === null && listing"
        :folder="folder"
        :root-name="workspace.name"
        :listing="listing"
      />
      <main v-else class="placeholder">
        <p v-if="fileError" role="alert">{{ fileError }}</p>
        <p v-else-if="files.length === 0">No Markdown files in {{ workspace.name }}.</p>
        <p v-else>Loading…</p>
      </main>

      <CommentsRail
        v-if="prefs.showComments"
        :comments="comments"
        :current-path="viewPath"
        @open-prompt="dialog = 'prompt'"
        @clear="store.clearComments($event)"
      />
    </div>

    <PromptDialog
      v-model:include-quotes="prefs.includeQuotes"
      :open="dialog === 'prompt'"
      :comments="comments"
      :current-path="viewPath"
      :prompt-base="promptBase"
      @close="dialog = null"
      @copied="onCopied"
    />
    <CommandPalette :open="dialog === 'palette'" :files="files" @close="dialog = null" @go="go" />
    <ShortcutsDialog :open="dialog === 'help'" @close="dialog = null" />

    <div class="toast" role="status" aria-live="polite">
      <span v-if="toast">{{ toast }}</span>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.body {
  display: grid;
  flex: 1;
  grid-template-columns: 290px minmax(0, 1fr) 320px;
  min-height: 0;
}

.body.no-files {
  grid-template-columns: minmax(0, 1fr) 320px;
}

.body.no-comments {
  grid-template-columns: 290px minmax(0, 1fr);
}

.body.no-files.no-comments {
  grid-template-columns: minmax(0, 1fr);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  color: var(--text-muted);
}

.fatal {
  max-width: 480px;
  margin: 15vh auto;
  padding: 0 16px;
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  z-index: 40;
  transform: translateX(-50%);
}

.toast span {
  display: block;
  padding: 10px 16px;
  border-radius: var(--radius);
  background: var(--primary);
  color: var(--primary-text);
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--shadow-pop);
}

/* Narrow windows drop the comments panel, then the files panel, whatever the toggles say. */
@media (max-width: 1100px) {
  .body,
  .body.no-comments {
    grid-template-columns: 250px minmax(0, 1fr);
  }

  .body.no-files {
    grid-template-columns: minmax(0, 1fr);
  }

  .body > .rail {
    display: none;
  }
}

@media (max-width: 720px) {
  .body,
  .body.no-comments {
    grid-template-columns: minmax(0, 1fr);
  }

  .body > .sidebar {
    display: none;
  }
}
</style>
