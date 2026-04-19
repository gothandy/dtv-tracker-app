<template>
  <div v-if="working" class="gallery-skeleton" :style="{ height: galleryHeight + 'px' }"></div>
  <div v-else-if="error" class="py-4 px-6 text-sm" style="color: var(--color-dtv-red)">{{ error }}</div>
  <div v-else-if="enrichedItems.length" class="tall-gallery">
    <MediaCarousel ref="carouselRef">
      <MediaCard
        v-for="(item, i) in enrichedItems"
        :key="item.id"
        :item="item"
        :clickable="true"
        :selected="i === selectedIndex"
        :show-edit-btn="showEditBtn"
        :min-ratio="3/4"
        :max-ratio="4/3"
        @select="onCardSelect(i)"
        @edit="editingItem = item"
      />
    </MediaCarousel>
  </div>

  <MediaEditModal
    v-if="editingItem"
    :item="editingItem"
    :show-cover="true"
    :is-cover="editingItem.listItemId === coverMediaId"
    @close="editingItem = null"
    @save="onModalSave"
    @delete="onModalDelete"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PhotoSwipe from 'photoswipe'
import 'photoswipe/style.css'
import MediaCarousel from '../../components/MediaCarousel.vue'
import MediaCard from '../../components/MediaCard.vue'
import MediaEditModal from '../../pages/modals/MediaEditModal.vue'
import type { MediaItem } from '../../types/media'

const props = defineProps<{
  media: MediaItem[]
  working?: boolean
  error?: string
  showEditBtn?: boolean
  coverMediaId?: number | null
}>()

const emit = defineEmits<{
  save: [item: MediaItem, data: { title: string; isPublic: boolean; isCover: boolean }]
  delete: [item: MediaItem]
}>()

const enrichedItems = ref<MediaItem[]>([])
const selectedIndex = ref<number | null>(null)
const editingItem   = ref<MediaItem | null>(null)
const galleryHeight = computed(() => Math.min(500, window.innerWidth * 0.75))
const carouselRef   = ref<InstanceType<typeof MediaCarousel> | null>(null)

function onCardSelect(i: number) {
  if (selectedIndex.value === i) {
    openLightbox(i)
  } else {
    selectedIndex.value = i
  }
}

function openLightbox(startIndex: number) {
  const pswp = new PhotoSwipe({
    dataSource: enrichedItems.value.map(item => ({
      src: item.url,
      width: item._w ?? 4,
      height: item._h ?? 3,
      alt: item.title ?? '',
    })),
    index: startIndex,
  })

  pswp.on('change', () => {
    selectedIndex.value = pswp.currIndex
    carouselRef.value?.scrollTo(pswp.currIndex)
  })

  pswp.on('close', () => {
    selectedIndex.value = pswp.currIndex
  })

  pswp.init()
}

function measureDimensions(mediaItems: MediaItem[]): Promise<void> {
  return new Promise(resolve => {
    if (!mediaItems.length) { resolve(); return }
    let pending = mediaItems.length
    const done = () => { if (--pending === 0) resolve() }
    for (const item of mediaItems) {
      const img = new Image()
      img.onload  = () => { item._w = img.naturalWidth  || 4; item._h = img.naturalHeight || 3; done() }
      img.onerror = () => { item._w = 4; item._h = 3; done() }
      img.src = item.url
    }
  })
}

watch(() => props.media, async (newMedia) => {
  const copies = newMedia.map(item => ({ ...item }))
  await measureDimensions(copies)
  enrichedItems.value = copies
}, { immediate: true })

function onModalSave(data: { title: string; isPublic: boolean; isCover: boolean }) {
  if (!editingItem.value) return
  emit('save', editingItem.value, data)
  editingItem.value = null
}

function onModalDelete() {
  if (!editingItem.value) return
  emit('delete', editingItem.value)
  editingItem.value = null
}
</script>

<style scoped>
.gallery-skeleton {
  background: var(--color-dtv-dark);
  width: 100%;
}

.tall-gallery :deep(.mg-viewport) {
  height: 250px !important;
}
</style>
