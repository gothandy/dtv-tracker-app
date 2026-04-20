<template>
  <div class="rl-wrap">
    <div class="rl-header">
      <h2 class="rl-title">
        Repeats and Regulars
        <span v-if="regularCount" class="rl-regulars">{{ regularCount }} regular{{ regularCount === 1 ? '' : 's' }}</span>
      </h2>
    </div>

    <p v-if="!items.length" class="rl-empty">No regulars in the past year.</p>

    <div v-else class="rl-grid">
      <RegularItem
        v-for="item in items"
        :key="item.slug"
        :name="item.name"
        :hours="item.hours"
        :is-regular="item.isRegular"
        :regular-id="item.regularId"
        :accompanying-adult-id="item.accompanyingAdultId"
        :working="workingSlug === item.slug"
        @edit="emit('editRegular', item.slug)"
      />
    </div>

    <div v-if="error" class="rl-error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RegularItem from './RegularItem.vue'

export interface RegularListItem {
  profileId?: number
  slug: string
  name: string
  hours: number
  isRegular: boolean
  regularId?: number
  accompanyingAdultId?: number
}

const props = defineProps<{
  items: RegularListItem[]
  workingSlug?: string
  error?: string
}>()

const emit = defineEmits<{
  editRegular: [slug: string]
}>()

const regularCount = computed(() => props.items.filter(i => i.isRegular).length)
</script>

<style scoped>
.rl-wrap {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
}

.rl-header {
  margin-bottom: 0.75rem;
}

.rl-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.rl-regulars {
  margin-left: 0.4rem;
  font-weight: 400;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.rl-empty {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
}

.rl-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.rl-error {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: var(--color-dtv-dirt-light);
  color: var(--color-dtv-dirt);
  font-size: 0.85rem;
}
</style>
