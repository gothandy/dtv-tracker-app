<template>
  <div class="pp-wrap" ref="wrapEl">
    <input
      v-model="query"
      class="pp-input"
      :placeholder="placeholder"
      autocomplete="off"
      @input="isSelected = false"
    />
    <ul v-if="filtered.length" class="pp-results">
      <li
        v-for="p in filtered"
        :key="p.id"
        class="pp-result"
        @click="select(p)"
      >
        {{ p.name }}
      </li>
    </ul>
    <div v-else-if="!isSelected && query.length >= 2" class="pp-empty">No results.</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface PickerProfile { id: number; name: string; email?: string }

const props = withDefaults(defineProps<{
  profiles: PickerProfile[]
  placeholder?: string
}>(), {
  placeholder: 'Search by name…',
})

const emit = defineEmits<{ select: [profile: PickerProfile] }>()

const query = ref('')
const isSelected = ref(false)
const wrapEl = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (wrapEl.value && !wrapEl.value.contains(e.target as Node)) {
    isSelected.value = true
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

const filtered = computed(() => {
  if (isSelected.value || query.value.length < 2) return []
  const q = query.value.toLowerCase()
  return props.profiles.filter(p => p.name.toLowerCase().includes(q))
})

function select(p: PickerProfile) {
  query.value = p.name
  isSelected.value = true
  emit('select', p)
}

function reset() {
  query.value = ''
  isSelected.value = false
}

defineExpose({ query, reset })
</script>

<style scoped>
.pp-wrap { position: relative; }

.pp-input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.45rem 0.6rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.pp-results {
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
  background: var(--color-dtv-light);
  box-shadow: var(--shadow-md);
  max-height: 240px;
  overflow-y: auto;
  position: relative;
  z-index: 10;
}

.pp-result {
  padding: 0.45rem 0.6rem;
  font-size: 0.95rem;
  color: var(--color-text);
  cursor: pointer;
}
.pp-result:hover { background: var(--color-dtv-sand); }

.pp-empty { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.5rem; }
</style>
