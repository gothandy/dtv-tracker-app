<template>
  <div class="pp-wrap" ref="wrapEl">
    <input
      ref="inputEl"
      v-model="query"
      class="pp-input"
      :class="{ 'pp-input--disabled': disabled }"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      @focus="onFocus"
      @input="onInput"
    />
    <Teleport to="body">
      <ul v-if="filtered.length" class="pp-results" :style="dropdownStyle">
        <li
          v-for="p in filtered"
          :key="p.id"
          class="pp-result"
          @click="select(p)"
        >
          {{ p.name }}
        </li>
      </ul>
      <div v-else-if="!addNew && !isSelected && query.length >= 2" class="pp-no-match" :style="dropdownStyle">
        No match — add new?
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive, type CSSProperties } from 'vue'

export interface PickerProfile { id: number; name: string; email?: string }

const props = withDefaults(defineProps<{
  profiles: PickerProfile[]
  placeholder?: string
  addNew?: boolean
  disabled?: boolean
}>(), {
  placeholder: 'Search by name…',
  addNew: false,
  disabled: false,
})

const emit = defineEmits<{ select: [profile: PickerProfile] }>()

const query = ref('')
const isSelected = ref(false)
const wrapEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const dropdownStyle = reactive<CSSProperties>({ position: 'fixed', top: '0px', left: '0px', width: '0px', zIndex: 1000 })

function updateDropdownPos() {
  if (!inputEl.value) return
  const r = inputEl.value.getBoundingClientRect()
  dropdownStyle.top = `${r.bottom + 2}px`
  dropdownStyle.left = `${r.left}px`
  dropdownStyle.width = `${r.width}px`
}

function onFocus() {
  isSelected.value = false
  updateDropdownPos()
}

function onInput() {
  isSelected.value = false
  updateDropdownPos()
}

function onDocClick(e: MouseEvent) {
  if (wrapEl.value && !wrapEl.value.contains(e.target as Node)) {
    isSelected.value = true
  }
}
onMounted(() => setTimeout(() => document.addEventListener('click', onDocClick)))
onUnmounted(() => document.removeEventListener('click', onDocClick))

const filtered = computed(() => {
  if (props.addNew || isSelected.value || query.value.length < 2) return []
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
.pp-input--disabled { opacity: 0.5; cursor: default; }

.pp-results {
  list-style: none;
  padding: 0;
  margin: 0;
  background: var(--color-dtv-light);
  box-shadow: var(--shadow-md);
  max-height: 240px;
  overflow-y: auto;
}

.pp-result {
  padding: 0.45rem 0.6rem;
  font-size: 0.95rem;
  color: var(--color-text);
  cursor: pointer;
}
.pp-result:hover { background: var(--color-dtv-sand); }

.pp-no-match {
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-style: italic;
  background: var(--color-dtv-light);
  box-shadow: var(--shadow-md);
}
</style>
