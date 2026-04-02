<template>
  <div class="mg-wrap">
    <div class="mg-title">{{ title }}</div>
    <div ref="viewportEl" class="mg-viewport" :style="{ height: height + 'px' }" >
      <div class="mg-track">
        <div
          v-for="(item, i) in items"
          :key="item.id"
          class="mg-slide"
          :class="{ 'mg-slide--clickable': props.clickable }"
          :style="{ width: slideWidth(item) + 'px' }"
          @click="emit('select', i)"
        >
          <img :src="item.largeUrl || item.thumbnailUrl" :alt="item.title ?? ''" @load="e => fadeIn(e.target as HTMLImageElement)" style="opacity:0" />
          <div v-if="item.title" class="mg-caption">{{ item.title }}</div>
        </div>
      </div>
    </div>

    <button class="mg-nav mg-nav-prev" aria-label="Previous" :disabled="!canScrollPrev" @click="scrollPrev">🞀</button>
    <button class="mg-nav mg-nav-next" aria-label="Next"     :disabled="!canScrollNext" @click="scrollNext">🞂</button>
    <div class="mg-footer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import EmblaCarousel from 'embla-carousel'
import type { EmblaCarouselType } from 'embla-carousel'
import type { MediaItem } from '../types/media'

const props = withDefaults(defineProps<{
  items: MediaItem[]
  title?: string
  maxHeight?: number  // cap in px — actual height = min(maxHeight, vw * 0.75)
  minRatio?: number   // min slide width÷height — 0.75 = portrait 3:4
  maxRatio?: number   // max slide width÷height — 1.33 = landscape 4:3
  clickable?: boolean
}>(), {
  title: 'Photos',
  maxHeight: 500,
  minRatio: 3 / 4,
  maxRatio: 4 / 3,
  clickable: false,
})

const emit = defineEmits<{ select: [index: number] }>()

const viewportEl    = ref<HTMLElement | null>(null)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)
const height        = ref(300)
let embla: EmblaCarouselType | null = null

function slideWidth(item: MediaItem): number {
  const ar = (item._w && item._h) ? item._w / item._h : 1
  return Math.round(height.value * Math.min(props.maxRatio, Math.max(props.minRatio, ar)))
}

function fadeIn(img: HTMLImageElement) {
  img.style.opacity = '1'
}

function scrollPrev() { embla?.scrollPrev() }
function scrollNext() { embla?.scrollNext() }

function initEmbla() {
  embla?.destroy(); embla = null
  if (!viewportEl.value) return
  embla = EmblaCarousel(viewportEl.value, { loop: false, align: 'start', dragFree: true })
  embla.on('settle', updateNav)
  updateNav()
}

function updateNav() {
  canScrollPrev.value = embla?.canScrollPrev() ?? false
  canScrollNext.value = embla?.canScrollNext() ?? false
}

onMounted(() => {
  height.value = Math.min(props.maxHeight, window.innerWidth * 0.75)
  if (props.items.length) initEmbla()
})

watch(() => props.items, (items) => { if (items.length) initEmbla() }, { flush: 'post' })

onUnmounted(() => embla?.destroy())
</script>

<style scoped>
.mg-wrap {
  position: relative;
  background: var(--color-dtv-dark);
}

.mg-title {
  background: black;
  color: var(--color-white);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  letter-spacing: 0.03em;
}

.mg-footer {
  background: black;
  height: 8px;
}

.mg-viewport {
  width: 100%;
  overflow: hidden;
}

.mg-track {
  display: flex;
  height: 100%;
  gap: 8px;
}

.mg-slide {
  flex-shrink: 0;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--color-dtv-dark);
}

.mg-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
  -webkit-user-drag: none;
  transition: opacity 0.25s;
}

.mg-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  display: inline-block;
  max-width: 100%;
  background: var(--color-caption-bg);
  color: var(--color-white);
  font-size: 0.75rem;
  padding: 3px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.mg-nav {
  position: absolute;
  top: calc(50% + 16px);  /* offset for title bar (~32px / 2) */
  transform: translateY(-50%);
  z-index: 10;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: var(--color-nav-bg);
  color: var(--color-text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  opacity: 0.75;
  transition: opacity 0.15s;
}

.mg-nav-prev { left: 10px; }
.mg-nav-next { right: 10px; }
.mg-nav-icon { width: 16px; height: 16px; }

.mg-nav:hover:not(:disabled) { opacity: 1; }
.mg-nav:disabled { opacity: 0.08; cursor: default; }

.mg-slide--clickable { cursor: pointer; }
.mg-slide--clickable:hover img { opacity: 0.88 !important; }
</style>
