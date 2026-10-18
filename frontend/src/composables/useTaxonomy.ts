import { ref } from 'vue'

export interface TaxNode { label: string; id: string; children?: TaxNode[] }

const tree = ref<TaxNode[]>([])
const loading = ref(false)
const loaded = ref(false)
/** Set when the term set couldn't be loaded, so callers can say so rather than use an empty tree. */
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/tags/taxonomy')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    tree.value = (await res.json()).data ?? []
    loaded.value = true
  } catch (e) {
    console.error('[useTaxonomy]', e)
    error.value = "Couldn't load the tags."
  } finally {
    loading.value = false
  }
}

/** Drop the in-memory tree so the next load hits the server (e.g. after admin cache clear). */
export function invalidateTaxonomyCache(): void {
  loaded.value = false
  tree.value = []
}

/** Refetch term tree from the API — used after server taxonomy cache is busted. */
export async function reloadTaxonomy(): Promise<void> {
  invalidateTaxonomyCache()
  await load()
}

export function useTaxonomy() {
  if (!loaded.value && !loading.value) load()
  return { tree, loading, error }
}
