<template>
  <div v-if="loading" class="gallery-skeleton" :style="{ height: galleryHeight + 'px' }"></div>
  <div v-else-if="error" class="py-4 px-6 text-sm" style="color: var(--color-dtv-red)">{{ error }}</div>
  <div v-else-if="items.length" class="tall-gallery">
    <MediaCarousel>
      <MediaCard
        v-for="(item, i) in items"
        :key="item.id"
        :item="item"
        :clickable="true"
        :selected="i === selectedIndex"
        :show-edit-btn="showEditBtn"
        :min-ratio="3/4"
        :max-ratio="4/3"
        @select="selectedIndex = i"
        @edit="editingItem = item"
      />
    </MediaCarousel>
  </div>

  <EditMediaModal
    v-if="editingItem"
    :item="editingItem"
    :show-cover="true"
    :is-cover="editingItem.listItemId === coverMediaId"
    @close="editingItem = null"
    @save="onSave"
    @delete="onDelete"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import MediaCarousel from '../../components/MediaCarousel.vue'
import MediaCard from '../../components/MediaCard.vue'
import EditMediaModal from '../../pages/modals/EditMediaModal.vue'
import type { MediaItem } from '../../types/media'

const props = defineProps<{
  groupKey: string
  date: string
  showEditBtn?: boolean
  coverMediaId?: number | null
}>()

const emit = defineEmits<{
  coverChanged: [id: number | null]
  coverItem: [item: MediaItem | null]
}>()

const items          = ref<MediaItem[]>([])
const loading        = ref(false)
const error          = ref<string | null>(null)
const selectedIndex  = ref<number | null>(null)
const editingItem    = ref<MediaItem | null>(null)
const galleryHeight  = computed(() => Math.min(500, window.innerWidth * 0.75))

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
    emit('coverItem', images.find(i => i.listItemId === props.coverMediaId) ?? null)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load photos'
    console.error('[SessionDetailGallery]', error.value)
  } finally {
    loading.value = false
  }
}

async function onSave(data: { title: string; isPublic: boolean; isCover: boolean }) {
  if (!editingItem.value) return
  const itemId = editingItem.value.id
  const itemListId = editingItem.value.listItemId
  editingItem.value = null

  await fetch(`/api/media/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: data.title, isPublic: data.isPublic }),
  })

  const wasCover = itemListId === props.coverMediaId
  if (data.isCover !== wasCover) {
    const newCoverId = data.isCover ? itemListId : null
    await fetch(`/api/sessions/${props.groupKey}/${props.date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverMediaId: newCoverId }),
    })
    emit('coverChanged', newCoverId)
  }

  await loadMedia()
}

async function onDelete() {
  if (!editingItem.value) return
  const itemId = editingItem.value.id
  editingItem.value = null

  await fetch(`/api/media/${itemId}?groupKey=${props.groupKey}&date=${props.date}`, {
    method: 'DELETE',
  })

  await loadMedia()
}

onMounted(loadMedia)
</script>

<style scoped>
.gallery-skeleton {
  background: var(--color-dtv-dark);
  width: 100%;
}

.tall-gallery :deep(.mg-viewport) {
  height: 300px !important;
}
</style>
