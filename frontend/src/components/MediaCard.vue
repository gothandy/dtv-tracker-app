<template>
  <div
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
    <div v-if="item.title" class="mg-caption">{{ item.title }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MediaItem } from '../types/media'

const props = withDefaults(defineProps<{
  item: MediaItem
  constrain?: 'height' | 'width'
  selected?: boolean
  clickable?: boolean
  minRatio?: number  // min width÷height — default 3:4 portrait
  maxRatio?: number  // max width÷height — default 4:3 landscape
}>(), {
  constrain: 'height',
  selected: false,
  clickable: false,
  minRatio: 3 / 4,
  maxRatio: 4 / 3,
})

const emit = defineEmits<{ select: [] }>()

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

.mg-slide--clickable { cursor: pointer; }
.mg-slide--clickable:hover img { opacity: 0.88 !important; }

.mg-slide--selected {
  box-shadow: inset 0 0 0 2px var(--color-dtv-green);
}
</style>
