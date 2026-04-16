<template>
  <div>
    <CardTitle>What you did last year?</CardTitle>
    <ul v-if="facts.length" class="contribution-list">
      <li v-for="fact in facts" :key="fact" class="contribution-item">{{ fact }}</li>
    </ul>
    <p v-else class="contribution-empty">No sessions recorded yet this year</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CardTitle from './CardTitle.vue'

const props = defineProps<{
  sessions: number
  hours: number
  earnedCard: boolean
  becameMember: boolean
  isFirstAider?: boolean
}>()

const facts = computed<string[]>(() => {
  const lines: string[] = []
  if (props.sessions > 0) lines.push(`Attended ${props.sessions} session${props.sessions === 1 ? '' : 's'}`)
  if (props.hours > 0) lines.push(`Volunteered ${Math.round(props.hours)} hour${Math.round(props.hours) === 1 ? '' : 's'}`)
  if (props.becameMember) lines.push('Renewed your charity membership')
  if (props.earnedCard) lines.push('Received a discount card')
  if (props.isFirstAider) lines.push('Were a registered first aider')
  return lines
})
</script>

<style scoped>
.contribution-list {
  list-style: none;
  margin: 0;
  padding: 0 1.5rem 1rem;
}

.contribution-item {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.5;
  padding: 0.2rem 0;
  color: var(--color-text);
}

.contribution-empty {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  padding: 0 1.5rem 1rem;
  margin: 0;
}
</style>
