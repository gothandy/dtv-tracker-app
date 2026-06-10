<template>
  <DefaultLayout>
    <h1 class="sr-only">Docs</h1>
    <PageHeader>Docs</PageHeader>
    <div class="px-6 pt-4 pb-8">
      <p v-if="loading" class="text-sm text-gray-500">Loading documents…</p>
      <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-else-if="!tree.length" class="text-sm text-gray-500">No documents available.</p>
      <div v-else class="text-black">
        <DocsSection :nodes="tree" :depth="0" />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageHeader from '../components/PageHeader.vue'
import DocsSection from '../components/docs/DocsSection.vue'
import { usePageTitle } from '../composables/usePageTitle'
import type { DocsTreeNode } from '../../../types/api-responses'

usePageTitle('Docs')

const route = useRoute()
const tree = ref<DocsTreeNode[]>([])
const loading = ref(true)
const error = ref('')

async function loadTree() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/docs')
    if (!res.ok) throw new Error(`Failed to load docs (${res.status})`)
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Failed to load docs')
    tree.value = json.data ?? []
  } catch (err) {
    console.error('Error loading docs:', err)
    error.value = 'Could not load documents. Please try again later.'
  } finally {
    loading.value = false
  }
}

function scrollToSection() {
  const pathParam = route.params.pathMatch
  const segments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : []
  const sectionPath = segments.join('/')
  if (!sectionPath) return
  nextTick(() => {
    document.getElementById(sectionPath)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

loadTree().then(scrollToSection)
watch(() => route.params.pathMatch, () => {
  if (!loading.value) scrollToSection()
})
</script>
