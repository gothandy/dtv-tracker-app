<template>
  <div v-if="linkedProfiles.length" class="pla-wrap">
    <p class="pla-heading">Also used by</p>
    <p class="pla-body">
      This email is also used by
      <template v-for="(p, i) in linkedProfiles" :key="p.id">
        <RouterLink :to="profilePath(p.slug)" class="pla-link">{{ p.name }}</RouterLink><template v-if="i < linkedProfiles.length - 1">, </template>
      </template>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { profilePath } from '../../router/index'

defineProps<{
  linkedProfiles: Array<{ id: number; slug: string; name: string }>
}>()
</script>

<style scoped>
.pla-wrap {
  padding: 0.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pla-heading {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin: 0;
}

.pla-body {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.5;
}

.pla-link {
  color: var(--color-dtv-green-dark);
  text-decoration: none;
}
.pla-link:hover { text-decoration: underline; }
</style>
