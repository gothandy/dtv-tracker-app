<template>
  <div class="pp-wrap">
    <input
      v-model="query"
      class="dtv-input"
      :placeholder="placeholder"
      autocomplete="off"
    />
    <ul v-if="filtered.length" class="pp-results">
      <li
        v-for="p in filtered"
        :key="p.id"
        class="pp-result"
        @click="emit('select', p)"
      >
        {{ p.name }}
      </li>
    </ul>
    <div v-else-if="query.length >= 2" class="pp-empty">No results.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface PickerProfile { id: number; name: string }

const props = withDefaults(defineProps<{
  profiles: PickerProfile[]
  placeholder?: string
}>(), {
  placeholder: 'Search by name…',
})

const emit = defineEmits<{ select: [profile: PickerProfile] }>()

const query = ref('')

const filtered = computed(() => {
  if (query.value.length < 2) return []
  const q = query.value.toLowerCase()
  return props.profiles.filter(p => p.name.toLowerCase().includes(q))
})

function clear() {
  query.value = ''
}

defineExpose({ clear })
</script>

<style scoped>
.pp-wrap { position: relative; }

.pp-results {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid var(--color-border);
  border-top: none;
  max-height: 240px;
  overflow-y: auto;
}

.pp-result {
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
  color: var(--color-text);
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
}
.pp-result:last-child { border-bottom: none; }
.pp-result:hover { background: var(--color-surface-hover); }

.pp-empty { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.5rem; }
</style>
