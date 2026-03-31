<template>
  <div v-if="loading" class="py-6 text-center text-sm" style="color: rgba(255,255,255,0.4)">Loading photos…</div>
  <div v-else-if="error" class="py-4 px-6 text-sm" style="color: #d6472b">{{ error }}</div>
  <MediaGallery v-else-if="items.length" :items="items" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MediaGallery from '../../components/MediaGallery.vue'
import type { MediaItem } from '../../types/media'

const props = defineProps<{ groupKey: string; date: string }>()

const items   = ref<MediaItem[]>([])
const loading = ref(false)
const error   = ref<string | null>(null)

function measureDimensions(mediaItems: MediaItem[]): Promise<void> {
  return new Promise(resolve => {
    if (!mediaItems.length) { resolve(); return }
    let pending = mediaItems.length
    const done = () => { if (--pending === 0) resolve() }
    for (const item of mediaItems) {
      const img = new Image()
      img.onload  = () => { item._w = img.naturalWidth  || 4; item._h = img.naturalHeight || 3; done() }
      img.onerror = () => { item._w = 4; item._h = 3; done() }
      img.src = item.largeUrl || item.thumbnailUrl
    }
  })
}

async function loadMedia() {
  loading.value = true
  error.value   = null
  try {
    const res  = await fetch(`/api/media?groupKey=${props.groupKey}&date=${props.date}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const images: MediaItem[] = (json.data ?? []).filter((i: MediaItem) => i.mimeType.startsWith('image/'))
    await measureDimensions(images)
    items.value = images
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load photos'
    console.error('[PhotoGalleryCard]', error.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadMedia)
</script>
