import { ref } from 'vue'

export interface TaxNode { label: string; id: string; children?: TaxNode[] }

const tree = ref<TaxNode[]>([])
const loading = ref(false)
const loaded = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await fetch('/api/tags/taxonomy')
    if (!res.ok) return
    tree.value = (await res.json()).data ?? []
    loaded.value = true
  } catch (e) {
    console.error('[useTaxonomy]', e)
  } finally {
    loading.value = false
  }
}

export function useTaxonomy() {
  if (!loaded.value && !loading.value) load()
  return { tree, loading }
}
