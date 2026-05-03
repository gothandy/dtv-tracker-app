<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>MediaCarousel</h1>

      <h2>Sessions with photos (homepage style)</h2>
      <MediaCarousel
        v-if="sessionItems.length"
        :max-height="280"
        title="Photos from recent events"
      >
        <MediaCard
          v-for="(item, i) in sessionItems"
          :key="item.id"
          :item="item"
          :clickable="true"
          :selected="i === selectedSessionIndex"
          @select="onSessionSelect(i)"
        />
      </MediaCarousel>
      <div v-else class="placeholder">Loading sessions…</div>
      <p v-if="selectedSession" class="note">Selected: {{ selectedSession }}</p>

      <h2>Session gallery — adhoc / 2026-03-26</h2>
      <div v-if="sessionGalleryLoading" class="placeholder" :style="{ height: galleryHeight + 'px' }">Loading…</div>
      <div v-else-if="sessionGalleryError" class="error">{{ sessionGalleryError }}</div>
      <MediaCarousel
        v-else-if="sessionGalleryItems.length"
        title="adhoc · 26 Mar 2026"
      >
        <MediaCard
          v-for="(item, i) in sessionGalleryItems"
          :key="item.id"
          :item="item"
          :clickable="true"
          :selected="i === selectedGalleryIndex"
          :show-edit-btn="true"
          @select="selectedGalleryIndex = i"
          @edit="editingItem = item"
        />
      </MediaCarousel>
      <div v-else class="placeholder">No photos found</div>

      <MediaEditModal
        v-if="editingItem"
        :item="editingItem"
        :show-cover="true"
        :is-cover="false"
        :working="sandboxEditWorking"
        :error="sandboxEditError"
        @close="closeSandboxEdit"
        @save="onSandboxMediaSave"
        @delete="onSandboxMediaDelete"
      />

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref, onMounted } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import MediaCarousel from '../../components/MediaCarousel.vue'
import MediaCard from '../../components/MediaCard.vue'
import MediaEditModal from '../modals/MediaEditModal.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { MediaItem } from '../../types/media'
import type { Session } from '../../types/session'

usePageTitle('Sandbox')

// ── Sessions gallery (homepage pattern) ────────────────────────────────────
const sessionItems    = ref<MediaItem[]>([])
const coverSessions   = ref<Session[]>([])
const selectedSession = ref<string | null>(null)
const selectedSessionIndex = ref<number | null>(null)

function onSessionSelect(index: number) {
  selectedSessionIndex.value = index
  const s = coverSessions.value[index]
  if (s) selectedSession.value = `${s.groupKey}/${s.date}`
}

async function loadSessionItems() {
  const res = await fetch('/api/sessions')
  if (!res.ok) return
  const json = await res.json()
  const sessions: Session[] = (json.data ?? [])
    .filter((s: Session) => (s.mediaCount ?? 0) > 0)
    .sort((a: Session, b: Session) => b.date.localeCompare(a.date))

  coverSessions.value = sessions
  sessionItems.value = sessions.map(s => ({
    id: String(s.id),
    listItemId: 0,
    url: `/media/${s.groupKey}/${s.date}/cover.jpg`,
    mimeType: 'image/jpeg',
    title: new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    isPublic: true,
  }))
}

// ── Single session gallery ─────────────────────────────────────────────────
const selectedGalleryIndex = ref<number | null>(null)
const editingItem          = ref<MediaItem | null>(null)
const sandboxEditWorking   = ref(false)
const sandboxEditError     = ref<string | undefined>()

function closeSandboxEdit() {
  editingItem.value = null
  sandboxEditError.value = undefined
}

async function onSandboxMediaSave(_data: { title: string; isPublic: boolean; isCover: boolean }) {
  sandboxEditWorking.value = true
  sandboxEditError.value = undefined
  try {
    await new Promise(r => setTimeout(r, 600))
    editingItem.value = null
  } catch (e) {
    sandboxEditError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    sandboxEditWorking.value = false
  }
}

function onSandboxMediaDelete() {
  editingItem.value = null
  sandboxEditError.value = undefined
}
const sessionGalleryItems   = ref<MediaItem[]>([])
const sessionGalleryLoading = ref(false)
const sessionGalleryError   = ref<string | null>(null)
const galleryHeight = Math.min(500, window.innerWidth * 0.75)

function measureDimensions(items: MediaItem[]): Promise<void> {
  return new Promise(resolve => {
    if (!items.length) { resolve(); return }
    let pending = items.length
    const done = () => { if (--pending === 0) resolve() }
    for (const item of items) {
      const img = new Image()
      img.onload  = () => { item._w = img.naturalWidth || 4; item._h = img.naturalHeight || 3; done() }
      img.onerror = () => { item._w = 4; item._h = 3; done() }
      img.src = item.url
    }
  })
}

async function loadSessionGallery() {
  sessionGalleryLoading.value = true
  sessionGalleryError.value = null
  try {
    const res = await fetch('/api/media?groupKey=adhoc&date=2026-03-26')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const images: MediaItem[] = (json.data ?? []).filter((i: MediaItem) => i.mimeType.startsWith('image/'))
    await measureDimensions(images)
    sessionGalleryItems.value = images
  } catch (e) {
    sessionGalleryError.value = e instanceof Error ? e.message : 'Failed to load photos'
    console.error('[SandboxMediaCarousel]', sessionGalleryError.value)
  } finally {
    sessionGalleryLoading.value = false
  }
}

onMounted(() => {
  loadSessionItems()
  loadSessionGallery()
})
</script>

<style scoped>
.note { font-size: 0.85rem; color: var(--color-text-muted); }
.error { font-size: 0.85rem; color: var(--color-dtv-red); }
.placeholder { font-size: 0.85rem; color: var(--color-text-muted); background: var(--color-dtv-dark); display: flex; align-items: center; justify-content: center; }
</style>
