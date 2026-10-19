<template>
  <div class="pp-wrap" ref="wrapEl">
    <input
      ref="inputEl"
      :value="query"
      class="pp-input"
      :class="{ 'pp-input--disabled': disabled }"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      @focus="onFocus"
      @input="onInput"
      @compositionupdate="onInput"
    />
    <Teleport to="body">
      <div v-if="panelOpen" ref="panelEl" class="pp-panel" :style="panelStyle">
      <ul v-if="filtered.length" class="pp-results">
        <li
          v-for="p in filtered"
          :key="p.id"
          class="pp-result"
          @click="select(p)"
        >
          <span class="pp-result-name">{{ p.name }}</span>
          <span v-if="p.email" class="pp-result-email">{{ p.email }}</span>
        </li>
      </ul>
      <div v-else class="pp-no-match">
        No match — add new?
      </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDropdownPanel } from '../composables/useDropdownPanel'

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

const emit = defineEmits<{ select: [profile: PickerProfile | null] }>()

const query = ref('')
const isSelected = ref(false)
const wrapEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)

const filtered = computed(() => {
  if (props.addNew || isSelected.value || query.value.length < 2) return []
  const q = query.value.toLowerCase()
  return props.profiles.filter(p => p.name.toLowerCase().includes(q))
})

/** The list shows the matches, or "No match" once two letters are typed (unless adding new). */
const panelOpen = computed(() =>
  filtered.value.length > 0 || (!props.addNew && !isSelected.value && query.value.length >= 2))

// The list is drawn on the page body and placed by the shared dropdown panel, which also
// follows the phone keyboard as it opens.
const { style: panelStyle, update: updatePanel } = useDropdownPanel({
  anchor: inputEl, panel: panelEl, open: panelOpen, close: () => { isSelected.value = true }, maxHeight: 240,
})

function onFocus() {
  isSelected.value = false
  updatePanel()
}

function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  isSelected.value = false
  updatePanel()
  emit('select', null)
}

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

.pp-panel {
  /* Position, width, height limit and stacking come from useDropdownPanel. */
  background: var(--color-dtv-light);
  box-shadow: var(--shadow-md);
}

.pp-results {
  list-style: none;
  padding: 0;
  margin: 0;
}

.pp-result {
  padding: 0.45rem 0.6rem;
  cursor: pointer;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  overflow: hidden;
}
.pp-result:hover { background: var(--color-dtv-sand); }

.pp-result-name {
  font-size: 0.95rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  max-width: 50%;
}

.pp-result-email {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.pp-no-match {
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
