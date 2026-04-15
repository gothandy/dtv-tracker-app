<template>
  <div class="mg-wrap">
    <div class="mg-title">{{ title }}</div>
    <div ref="viewportEl" class="mg-viewport" :style="{ height: height + 'px' }" >
      <div class="mg-track">
        <slot />
      </div>
    </div>

    <button class="mg-nav mg-nav-prev" aria-label="Previous" :disabled="!canScrollPrev" @click="scrollPrev">
      <img src="/icons/arrows/left.svg" alt="" width="20" height="20" class="svg-white" />
    </button>
    <button class="mg-nav mg-nav-next" aria-label="Next" :disabled="!canScrollNext" @click="scrollNext">
      <img src="/icons/arrows/right.svg" alt="" width="20" height="20" class="svg-white" />
    </button>
    <div class="mg-footer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import EmblaCarousel from 'embla-carousel'
import type { EmblaCarouselType } from 'embla-carousel'

const props = withDefaults(defineProps<{
  title?: string
  maxHeight?: number  // cap in px — actual height = min(maxHeight, vw * 0.75)
}>(), {
  title: 'Photos',
  maxHeight: 500,
})

const viewportEl    = ref<HTMLElement | null>(null)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)
const height        = ref<number>(300)
let embla: EmblaCarouselType | null = null


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
  nextTick(initEmbla)
})

onUnmounted(() => embla?.destroy())
</script>

<style scoped>
.mg-wrap {
  position: relative;
  background: black;
  padding: 0 1.5rem;
}

.mg-title {
  background: black;
  color: var(--color-white);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 0.75rem 0.5rem 0;
  letter-spacing: 0.03em;
}

.mg-footer {
  background: black;
  height: 8px;
  margin: 0 -1.5rem;
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
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  opacity: 0.75;
  transition: opacity 0.15s;
}


.mg-nav-prev { left: calc(1.5rem + 10px); }
.mg-nav-next { right: calc(1.5rem + 10px); }

.mg-nav:hover:not(:disabled) { opacity: 1; }
.mg-nav:disabled { opacity: 0.08; cursor: default; }
</style>
