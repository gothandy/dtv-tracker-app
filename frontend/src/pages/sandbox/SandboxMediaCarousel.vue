<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>MediaCarousel</h1>

      <h2>Sessions with photos (homepage style)</h2>
      <MediaCarousel
        v-if="sessionItems.length"
        :items="sessionItems"
        :max-height="280"
        :clickable="true"
        title="Photos from recent events"
        @select="i => onSessionSelect(i)"
      />
      <div v-else class="placeholder">Loading sessions…</div>
      <p v-if="selectedSession" class="note">Selected: {{ selectedSession }}</p>

      <h2>Session gallery — adhoc / 2026-03-26</h2>
      <div v-if="sessionGalleryLoading" class="placeholder" :style="{ height: galleryHeight + 'px' }">Loading…</div>
      <div v-else-if="sessionGalleryError" class="error">{{ sessionGalleryError }}</div>
      <MediaCarousel
        v-else-if="sessionGalleryItems.length"
        :items="sessionGalleryItems"
        title="adhoc · 26 Mar 2026"
      />
      <div v-else class="placeholder">No photos found</div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import MediaCarousel from '../../components/MediaCarousel.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { MediaItem } from '../../types/media'
import type { Session } from '../../types/session'

usePageTitle('Sandbox')

// ── Sessions gallery (homepage pattern) ────────────────────────────────────
const sessionItems    = ref<MediaItem[]>([])
const coverSessions   = ref<Session[]>([])
const selectedSession = ref<string | null>(null)

function onSessionSelect(index: number) {
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
    thumbnailUrl: `/media/${s.groupKey}/${s.date}/cover.jpg`,
    largeUrl:     `/media/${s.groupKey}/${s.date}/cover.jpg`,
    mimeType: 'image/jpeg',
    title: new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    isPublic: true,
  }))
}

// ── Single session gallery ─────────────────────────────────────────────────
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
      img.src = item.largeUrl || item.thumbnailUrl
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
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back { color: var(--color-dtv-green); text-decoration: none; font-size: 0.9rem; }
.back:hover { text-decoration: underline; }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

h2 { font-size: 1rem; font-weight: 600; color: var(--color-text-muted); }

.note { font-size: 0.85rem; color: var(--color-text-muted); }
.error { font-size: 0.85rem; color: var(--color-dtv-red); }
.placeholder { font-size: 0.85rem; color: var(--color-text-muted); background: var(--color-dtv-dark); display: flex; align-items: center; justify-content: center; }
</style>
