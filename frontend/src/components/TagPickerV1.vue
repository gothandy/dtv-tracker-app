<template>
  <div class="tp-wrap" ref="wrapEl">
    <button class="tp-btn" :class="{ active: !!modelValue }" @click="togglePanel">
      <span>{{ displayLabel }}</span>
      <span>{{ panelOpen ? '▲' : '▼' }}</span>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface TaxNode { label: string; id: string; children?: TaxNode[] }
interface TagOption { label: string; displayLabel: string; depth: number; termGuid: string }

const props = defineProps<{
  modelValue: string        // '' = all tags, '__none__' = untagged, or colon-path label
  showNoTags?: boolean      // show "No tags" option (useful for filter contexts)
  placeholder?: string
  availableLabels?: Set<string> // if set, only show tags present in this set (or with descendants in it)
}>()

const emit = defineEmits<{
  'update:modelValue': [v: string]
  'select': [label: string, termGuid: string]
}>()

const panelOpen = ref(false)
const loading = ref(false)
const tree = ref<TaxNode[]>([])
const wrapEl = ref<HTMLElement | null>(null)

const displayLabel = computed(() => {
  if (!props.modelValue) return props.placeholder ?? 'All tags'
  if (props.modelValue === '__none__') return 'No tags'
  return flatOptions.value.find(o => o.label === props.modelValue)?.displayLabel ?? props.modelValue
})

function flatten(nodes: TaxNode[], displayPrefix = '', depth = 0): TagOption[] {
  return nodes.flatMap(node => {
    const label = displayPrefix ? `${displayPrefix}:${node.label}` : node.label
    const displayLabel = displayPrefix ? `${displayPrefix} > ${node.label}` : node.label
    return [
      { label, displayLabel, depth, termGuid: node.id },
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
  const all = flatten(tree.value)
  return props.availableLabels ? all.filter(o => isAvailable(o.label)) : all
})

async function loadTree() {
  if (tree.value.length || loading.value) return
  loading.value = true
  try {
    const res = await fetch('/api/tags/taxonomy')
    if (!res.ok) return
    const json = await res.json()
    tree.value = json.data ?? []
  } catch (e) {
    console.error('[TagPickerV1]', e)
  } finally {
    loading.value = false
  }
}

function togglePanel() {
  if (!panelOpen.value) {
    wrapEl.value?.dispatchEvent(new CustomEvent('dropdown-opened', { bubbles: true }))
  }
  panelOpen.value = !panelOpen.value
}

function onDropdownOpened(e: Event) {
  if (wrapEl.value && !wrapEl.value.contains(e.target as Node)) panelOpen.value = false
}

watch(panelOpen, open => { if (open) loadTree() })

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
.tp-wrap { position: relative; }

.tp-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  background: var(--color-white);
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--color-text);
  cursor: pointer;
  white-space: nowrap;
}
.tp-btn:hover { background: var(--color-surface-hover); }
.tp-btn.active { border-color: var(--color-dtv-green); color: var(--color-green-hover); font-weight: 600; }

.tp-panel {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 220px;
  max-height: 280px;
  overflow-y: auto;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  z-index: 50;
}

.tp-loading { padding: 0.75rem; font-size: 0.85rem; color: var(--color-text-muted); }

.tp-tree { list-style: none; margin: 0; padding: 0; }

.tp-row {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text);
  cursor: pointer;
}
.tp-row:hover { background: var(--color-surface-hover); }
.tp-row.selected { color: var(--color-green-hover); font-weight: 600; background: var(--color-green-tint); }
</style>
