<template>
  <div class="concertina-item" :class="{ 'concertina-item--selected': isSelected }">
    <AppButton
      :label="label"
      :icon="icon"
      :selected="isSelected ? null : false"
      class="concertina-item__btn"
      @click="handleClick"
    />
    <div class="concertina-item__card" :class="{ 'concertina-item__card--open': isSelected }">
      <div class="concertina-item__card-inner">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import AppButton from './AppButton.vue'

const props = defineProps<{
  label: string
  icon?: string
  onSelectedClick?: () => void
}>()

const concertina = inject<{
  selectedIndex: ReturnType<typeof ref<number | null>>
  registerItem: () => number
  toggle: (index: number) => void
}>('concertina')

if (!concertina) throw new Error('ConcertinaItem must be used inside ConcertinaLayout')

const myIndex = concertina.registerItem()

const isSelected = computed(() => concertina.selectedIndex.value === myIndex)

function handleClick() {
  if (isSelected.value) {
    props.onSelectedClick?.()
  } else {
    concertina!.toggle(myIndex)
  }
}
</script>

<style scoped>
.concertina-item {
  display: flex;
  flex-direction: column;
}


.concertina-item__btn {
  width: 100%;
}

:deep(.app-btn--unselected) {
  background: var(--color-dtv-gold);
  color: var(--color-white);
}

.concertina-item__card {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}

.concertina-item__card--open {
  grid-template-rows: 1fr;
}

.concertina-item__card-inner {
  overflow: hidden;
  min-height: 0;
}
</style>
