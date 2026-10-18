<template>
  <DefaultLayout>
    <h1 class="sr-only">Email templates</h1>
    <PageHeader>Templates</PageHeader>
    <div class="pb-6">
      <TemplateListFilter :templates="templates" @filtered="filtered = $event" />
      <TemplateListResults :templates="filtered" :loading="loading" :error="error" />
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageHeader from '../components/PageHeader.vue'
import TemplateListFilter from '../components/templates/TemplateListFilter.vue'
import TemplateListResults from '../components/templates/TemplateListResults.vue'
import { usePageTitle } from '../composables/usePageTitle'
import type { TemplateResponse } from '../../../types/api-responses'

usePageTitle('Templates')

const templates = ref<TemplateResponse[]>([])
const filtered = ref<TemplateResponse[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/api/templates')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    templates.value = (await res.json() as { data: TemplateResponse[] }).data
  } catch (e) {
    console.error('[TemplateListPage] load', e)
    error.value = 'Could not load email templates. Please try again.'
  } finally {
    loading.value = false
  }
})
</script>
