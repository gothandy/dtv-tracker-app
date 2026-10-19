<template>
  <DefaultLayout>
    <h1 class="sr-only">Email templates</h1>
    <PageHeader>Templates</PageHeader>
    <div class="pb-6">
      <TemplateListFilter :templates="templates" @filtered="filtered = $event" />
      <TemplateListActions
        :templates="filtered"
        :can-edit="viewer.can('editTemplates')"
        @add-template="showAddTemplate = true"
      />
      <TemplateListResults :templates="filtered" :loading="loading" :error="error" />
    </div>

    <TemplateAddModal
      v-if="showAddTemplate"
      :working="addTemplateWorking"
      :error="addTemplateError"
      @close="showAddTemplate = false; addTemplateError = ''"
      @add="onAddTemplate"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageHeader from '../components/PageHeader.vue'
import TemplateListFilter from '../components/templates/TemplateListFilter.vue'
import TemplateListResults from '../components/templates/TemplateListResults.vue'
import TemplateListActions from '../components/templates/TemplateListActions.vue'
import TemplateAddModal, { type AddTemplatePayload } from './modals/TemplateAddModal.vue'
import { useViewer } from '../composables/useViewer'
import { templatePath } from '../router'
import { usePageTitle } from '../composables/usePageTitle'
import type { TemplateResponse } from '../../../types/api-responses'

usePageTitle('Templates')

const templates = ref<TemplateResponse[]>([])
const filtered = ref<TemplateResponse[]>([])
const loading = ref(true)
const error = ref('')
const router = useRouter()
const viewer = useViewer()
const showAddTemplate = ref(false)
const addTemplateWorking = ref(false)
const addTemplateError = ref('')

async function onAddTemplate(data: AddTemplatePayload) {
  addTemplateWorking.value = true
  addTemplateError.value = ''
  try {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: data.name, subject: data.subject, context: data.context }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to create template')
    }
    const json = await res.json()
    showAddTemplate.value = false
    if (json.data?.id) router.push(templatePath(json.data.id))
  } catch (e) {
    addTemplateError.value = e instanceof Error ? e.message : 'An error occurred'
    console.error('[TemplateListPage] onAddTemplate', e)
  } finally {
    addTemplateWorking.value = false
  }
}

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
