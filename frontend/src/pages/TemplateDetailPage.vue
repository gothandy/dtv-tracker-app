<template>
  <DefaultLayout>
    <h1 v-if="template" class="sr-only">{{ template.title }}</h1>
    <LoadingSpinner v-if="loading" />
    <div v-else-if="error" class="td-state td-state--error">{{ error }}</div>
    <template v-else-if="template">
      <PageHeader>{{ template.title }}</PageHeader>

      <LayoutColumns ratio="2-1" align="start">
        <template #left>
          <div class="td-header">
            <p class="td-about">
              <strong>{{ template.context }}</strong> template: {{ ABOUT[template.context] }}
              The preview below uses made-up data.
            </p>
          </div>
        </template>
        <template #right>
          <TemplateDetailActions
            ref="actionsRef"
            :template="template"
            :can-edit="viewer.can('editTemplates')"
            @edit-template="onEditTemplate"
            @delete-template="onDeleteTemplate"
          />
        </template>
      </LayoutColumns>

      <section class="td-panel">
        <h2>Subject</h2>
        <p class="td-subject">{{ template.preview.subject }}</p>
      </section>

      <section class="td-panel">
        <!-- Which version (left) and how it's shown (right). -->
        <div class="td-tabs">
          <div class="td-tab-group">
            <AppButton
              v-for="f in FORMATS"
              :key="f"
              :label="f"
              :variant="format === f ? 'primary' : 'subtle'"
              :selected="format === f"
              @click="format = f"
            />
          </div>
          <div class="td-tab-group">
            <AppButton
              v-for="v in VIEWS"
              :key="v"
              :label="v"
              :variant="view === v ? 'primary' : 'subtle'"
              :selected="view === v"
              @click="view = v"
            />
          </div>
        </div>

        <template v-if="view === 'Preview'">
          <!-- Sandboxed: the template's markup can't run scripts or reach the tracker, and its styles stay inside. -->
          <iframe v-if="format === 'HTML'" class="td-html" sandbox="" :srcdoc="template.preview.html" :title="`${template.title} preview`" />
          <pre v-else class="td-text">{{ template.preview.text }}</pre>
        </template>
        <!-- The template's Handlebars source, to copy; read-only for now. -->
        <ModalFormTextarea v-else-if="format === 'HTML'" v-model="htmlSource" :rows="20" readonly />
        <ModalFormTextarea v-else v-model="textSource" :rows="20" readonly />
      </section>
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageHeader from '../components/PageHeader.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import AppButton from '../components/AppButton.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ModalFormTextarea from '../components/forms/ModalFormTextarea.vue'
import TemplateDetailActions from '../components/templates/TemplateDetailActions.vue'
import type { EditTemplatePayload } from './modals/TemplateEditModal.vue'
import { useViewer } from '../composables/useViewer'
import { templatesPath } from '../router'
import { usePageTitle } from '../composables/usePageTitle'
import type { TemplateDetailResponse } from '../../../types/api-responses'
import type { TemplateContext } from '../../../types/email-template'

/** Who a template of each context goes to, and from where. */
const ABOUT: Record<TemplateContext, string> = {
  Session: "about one session, sent to its entries (each personalised) from the session page's Send Email.",
  Profile: "about one volunteer, sent to the ticked profiles from the Profiles page's Send Email.",
}

const route = useRoute()
const router = useRouter()
const viewer = useViewer()
const template = ref<TemplateDetailResponse | null>(null)
const actionsRef = ref<InstanceType<typeof TemplateDetailActions> | null>(null)

const FORMATS = ['HTML', 'Text'] as const
const VIEWS = ['Preview', 'Source'] as const
const format = ref<typeof FORMATS[number]>('HTML')
const view = ref<typeof VIEWS[number]>('Preview')
const textSource = ref('')
const htmlSource = ref('')
const loading = ref(true)
const error = ref('')

usePageTitle(() => template.value?.title ?? 'Template')

async function load() {
  try {
    const res = await fetch(`/api/templates/${encodeURIComponent(String(route.params.id))}`)
    if (res.status === 404) throw new Error("This template doesn't exist.")
    if (!res.ok) throw new Error('Could not load the template. Please try again.')
    template.value = (await res.json() as { data: TemplateDetailResponse }).data
    textSource.value = template.value.text
    htmlSource.value = template.value.html
  } catch (e) {
    console.error('[TemplateDetailPage] load', e)
    error.value = e instanceof Error ? e.message : 'Could not load the template.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function onEditTemplate(payload: EditTemplatePayload) {
  if (!template.value) return
  try {
    const res = await fetch(`/api/templates/${template.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: payload.name, subject: payload.subject, context: payload.context }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to update template')
    }
    actionsRef.value?.onEditSuccess()
    await load()
  } catch (e) {
    actionsRef.value?.onEditError(e instanceof Error ? e.message : 'Update failed')
    console.error('[TemplateDetailPage] onEditTemplate', e)
  }
}

async function onDeleteTemplate() {
  if (!template.value) return
  try {
    const res = await fetch(`/api/templates/${template.value.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    actionsRef.value?.onDeleteSuccess()
    router.push(templatesPath())
  } catch (e) {
    console.error('[TemplateDetailPage] onDeleteTemplate', e)
  }
}</script>

<style scoped>
.td-panel {
  background: var(--color-white);
  padding: 1rem 1.5rem;
  margin-top: 1rem;
}

.td-panel h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 700;
}

/* Same as the project page's header (ProjectDetailHeader). */
.td-header {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
}

.td-about {
  margin: 0;
}


.td-subject {
  margin: 0;
}

.td-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.td-tab-group {
  display: flex;
  gap: 0.5rem;
}

.td-html {
  display: block;
  width: 100%;
  height: 70vh;
  border: 1px solid var(--color-border);
}

.td-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 0.95rem;
}

.td-state { text-align: center; padding: 3rem; color: var(--color-text-muted); }
.td-state--error { color: var(--color-dtv-red); }
</style>
