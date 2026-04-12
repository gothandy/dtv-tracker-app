<template>
  <div class="tp-wrap" ref="wrapEl">
    <button class="tp-btn" :class="{ active: !!modelValue, open: panelOpen }" :disabled="disabled" @click="togglePanel">
      <span>{{ displayLabel }}</span>
      <img :src="panelOpen ? '/icons/arrows/up.svg' : '/icons/arrows/down.svg'" width="12" height="12" alt="" class="tp-chevron svg-black" />
    </button>
    <div v-if="panelOpen" class="tp-panel">
      <div v-if="loading" class="tp-loading">Loading…</div>
      <ul v-else class="tp-tree">
        <li>
          <div :class="['tp-row', { selected: !modelValue }]" @click="select('', '')">
            <em>All tags</em>
          </div>
        </li>
        <li v-if="showNoTags">
          <div :class="['tp-row', { selected: modelValue === '__none__' }]" @click="select('__none__', 'No tags')">
            <em>No tags</em>
          </div>
        </li>
        <li v-for="opt in flatOptions" :key="opt.label">
          <div
            :class="['tp-row', { selected: modelValue === opt.label }]"
            :style="{ paddingLeft: (0.75 + opt.depth * 1.25) + 'rem' }"
            @click="select(opt.label, opt.displayLabel)"
          >{{ opt.displayLabel }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { TaxNode } from '../composables/useTaxonomy'

interface TagOption { label: string; displayLabel: string; depth: number; termGuid: string }

const props = defineProps<{
  modelValue: string        // '' = all tags, '__none__' = untagged, or colon-path label
  tree: TaxNode[]
  loading?: boolean
  showNoTags?: boolean      // show "No tags" option (useful for filter contexts)
  placeholder?: string
  availableLabels?: Set<string> // if set, only show tags present in this set (or with descendants in it)
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [v: string]
  'select': [label: string, termGuid: string]
}>()

const panelOpen = ref(false)
const wrapEl = ref<HTMLElement | null>(null)

const displayLabel = computed(() => {
  if (!props.modelValue) return props.placeholder ?? 'All tags'
  if (props.modelValue === '__none__') return 'No tags'
  return flatOptions.value.find(o => o.label === props.modelValue)?.displayLabel ?? props.modelValue
})

function flatten(nodes: TaxNode[], labelPrefix = '', depth = 0): TagOption[] {
  return nodes.flatMap(node => {
    const label = labelPrefix ? `${labelPrefix}:${node.label}` : node.label
    return [
      { label, displayLabel: node.label, depth, termGuid: node.id },
      ...flatten(node.children ?? [], label, depth + 1)
    ]
  })
}

function isAvailable(label: string): boolean {
  if (!props.availableLabels) return true
  return props.availableLabels.has(label) ||
    [...props.availableLabels].some(l => l.startsWith(label + ':'))
}

const flatOptions = computed(() => {
  const all = flatten(props.tree)
  return props.availableLabels ? all.filter(o => isAvailable(o.label)) : all
})

function togglePanel() {
  if (!panelOpen.value) {
    wrapEl.value?.dispatchEvent(new CustomEvent('dropdown-opened', { bubbles: true }))
  }
  panelOpen.value = !panelOpen.value
}

function onDropdownOpened(e: Event) {
  if (wrapEl.value && !wrapEl.value.contains(e.target as Node)) panelOpen.value = false
}

function select(label: string, _display: string) {
  const termGuid = flatOptions.value.find(o => o.label === label)?.termGuid ?? ''
  emit('update:modelValue', label)
  emit('select', label, termGuid)
  panelOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (wrapEl.value && !wrapEl.value.contains(e.target as Node)) {
    panelOpen.value = false
  }
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('dropdown-opened', onDropdownOpened)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('dropdown-opened', onDropdownOpened)
})
</script>

<style scoped>
.tp-wrap { position: relative; width: 100%; }

.tp-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: none;
  background: var(--color-dtv-light);
  font-size: 0.95rem;
  font-family: inherit;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}
.tp-btn.open {
  outline: 2px solid var(--color-dtv-dark);
  outline-offset: 3px;
}
.tp-btn:disabled {
  background: var(--color-dtv-sand-light);
  color: var(--color-dtv-sand-dark);
  cursor: default;
}

.tp-chevron { flex-shrink: 0; margin-left: 0.5rem; }

.tp-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  min-width: 220px;
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--color-dtv-light);
  box-shadow: var(--shadow-md);
  z-index: 50;
}

.tp-loading { padding: 0.75rem; font-size: 0.9rem; color: var(--color-text-muted); }

.tp-tree { list-style: none; margin: 0; padding: 0; }

.tp-row {
  padding: 0.45rem 0.75rem;
  font-size: 0.95rem;
  color: var(--color-text);
  cursor: pointer;
  white-space: nowrap;
}
.tp-row:hover { background: var(--color-dtv-sand); }
.tp-row.selected { background: var(--color-dtv-dark); color: var(--color-dtv-light); }
</style>
