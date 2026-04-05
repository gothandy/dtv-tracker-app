<template>
  <div class="concertina-item" :class="{ 'concertina-item--selected': isSelected }">
    <AppButton
      :label="label"
      :icon="icon"
      :selected="isSelected ? null : false"
      class="concertina-item__btn"
      @click="concertina.toggle(myIndex)"
    />
    <div v-if="isSelected" class="concertina-item__card">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import AppButton from './AppButton.vue'

defineProps<{
  label: string
  icon?: string
}>()

const concertina = inject<{
  selectedIndex: ReturnType<typeof ref<number | null>>
  registerItem: () => number
  toggle: (index: number) => void
}>('concertina')

if (!concertina) throw new Error('ConcertinaItem must be used inside ConcertinaLayout')

const myIndex = concertina.registerItem()

const isSelected = computed(() => concertina.selectedIndex.value === myIndex)
</script>

<style scoped>
.concertina-item {
  display: flex;
  flex-direction: column;
}

.concertina-item--selected {
  flex: 1;
}

.concertina-item__btn {
  width: 100%;
}

.concertina-item__card {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
