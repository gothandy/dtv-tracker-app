<template>
  <div
    ref="el"
    class="mg-slide"
    :class="{
      'mg-slide--clickable': clickable,
      'mg-slide--selected': selected,
      'mg-slide--constrain-height': constrain === 'height',
      'mg-slide--constrain-width': constrain === 'width',
    }"
    :style="{ aspectRatio: String(clampedRatio) }"
    @click="handleClick"
  >
    <img
      :src="item.largeUrl || item.thumbnailUrl"
      :alt="item.title ?? ''"
      style="opacity: 0"
      @load="e => fadeIn(e.target as HTMLImageElement)"
    />

    <!-- Caption bar: title + edit icon (when selected) -->
    <div
      v-if="item.title || (showEditBtn && selected)"
      ref="captionEl"
      class="mg-caption"
      :class="{
        'mg-caption--editable': showEditBtn && selected,
        'mg-caption--edit-only': !item.title && showEditBtn && selected,
      }"
      :style="{ left: captionLeft + 'px' }"
      @click.stop="showEditBtn && selected ? emit('edit') : undefined"
    >
      <span v-if="item.title" class="mg-caption-text">{{ item.title }}</span>
      <span v-if="showEditBtn && selected" class="mg-caption-edit">
        <img src="/icons/edit.svg" aria-hidden="true" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { MediaItem } from '../types/media'

const props = withDefaults(defineProps<{
  item: MediaItem
  constrain?: 'height' | 'width'
  selected?: boolean
  clickable?: boolean
  showEditBtn?: boolean
  minRatio?: number  // min width÷height — default unconstrained
  maxRatio?: number  // max width÷height — default unconstrained
}>(), {
  constrain: 'height',
  selected: false,
  clickable: false,
  showEditBtn: false,
  minRatio: 0,
  maxRatio: Infinity,
})

const emit = defineEmits<{ select: []; edit: [] }>()

const el = ref<HTMLElement | null>(null)
const captionEl = ref<HTMLElement | null>(null)
const captionLeft = ref(0)
let rafId: number | null = null

function measureOffset() {
  if (!el.value) return
  const container = el.value.closest('.mg-viewport') as HTMLElement | null
  if (!container) return
  const cardRect = el.value.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const hiddenLeft = containerRect.left - cardRect.left
  const captionWidth = captionEl.value?.offsetWidth ?? 0
  const maxLeft = cardRect.width - captionWidth
  captionLeft.value = Math.min(maxLeft, Math.max(0, hiddenLeft))
  rafId = requestAnimationFrame(measureOffset)
}

function stopMeasuring() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  captionLeft.value = 0
}

onMounted(measureOffset)
onUnmounted(stopMeasuring)

const clampedRatio = computed(() => {
  const ar = (props.item._w && props.item._h) ? props.item._w / props.item._h : 1
  return Math.min(props.maxRatio, Math.max(props.minRatio, ar))
})

function fadeIn(img: HTMLImageElement) {
  img.style.opacity = '1'
}

function handleClick() {
  if (props.clickable) emit('select')
}
</script>

<style scoped>
.mg-slide {
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: var(--color-dtv-dark);
}

.mg-slide--constrain-height { height: 100%; }
.mg-slide--constrain-width  { width: 100%; }

.mg-slide > img {
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
  display: inline-flex;
  align-items: center;
  height: 1.5rem;
  max-width: 100%;
  background: var(--color-caption-bg);
  color: var(--color-white);
  font-size: 0.75rem;
  pointer-events: none;
}

.mg-caption-text {
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mg-caption-edit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.mg-caption-edit img {
  width: 0.75rem;
  height: 0.75rem;
  filter: brightness(0) invert(1);
}

/* Editable caption: fits content, clickable */
.mg-caption--editable {
  cursor: pointer;
  pointer-events: auto;
}


.mg-slide--selected .mg-caption {
  background: var(--color-dtv-green);
}


.mg-slide--clickable { cursor: pointer; }
.mg-slide--clickable:hover > img { opacity: 0.88 !important; }
</style>
