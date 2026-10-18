<template>
  <DefaultLayout>
    <h1 v-if="template" class="sr-only">{{ template.title }}</h1>
    <LoadingSpinner v-if="loading" />
    <div v-else-if="error" class="td-state td-state--error">{{ error }}</div>
    <template v-else-if="template">
      <PageHeader>{{ template.title }}</PageHeader>

      <section class="td-panel">
        <p class="td-about">
          <strong>{{ template.context }}</strong> template: {{ ABOUT[template.context] }}
          The preview below uses made-up data.
        </p>
        <div class="td-actions">
          <AppButton label="Back to templates" variant="subtle" @click="router.push(templatesPath())" />
          <AppButton v-if="template.editUrl" label="Edit in SharePoint" :href="template.editUrl" target="_blank" />
        </div>
      </section>

      <section class="td-panel">
        <h2>Subject</h2>
        <p class="td-subject">{{ template.preview.subject }}</p>
      </section>

      <section v-if="template.preview.html" class="td-panel">
        <h2>Email</h2>
        <!-- Sandboxed: the template's markup can't run scripts or reach the tracker, and its styles stay inside. -->
        <iframe class="td-html" sandbox="" :srcdoc="template.preview.html" :title="`${template.title} preview`" />
      </section>

      <section class="td-panel">
        <h2>Text version</h2>
        <pre class="td-text">{{ template.preview.text }}</pre>
      </section>
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageHeader from '../components/PageHeader.vue'
import AppButton from '../components/AppButton.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import { usePageTitle } from '../composables/usePageTitle'
import { templatesPath } from '../router'
import type { TemplateDetailResponse } from '../../../types/api-responses'
import type { TemplateContext } from '../../../types/email-template'

/** Who a template of each context goes to, and from where. */
const ABOUT: Record<TemplateContext, string> = {
  Session: "about one session, sent to its entries (each personalised) from the session page's Send Email.",
  Profile: "about one volunteer, sent to the ticked profiles from the Profiles page's Send Email.",
}

const route = useRoute()
const router = useRouter()
const template = ref<TemplateDetailResponse | null>(null)
const loading = ref(true)
const error = ref('')

usePageTitle(() => template.value?.title ?? 'Template')

onMounted(async () => {
  try {
    const res = await fetch(`/api/templates/${encodeURIComponent(String(route.params.id))}`)
    if (res.status === 404) throw new Error("This template doesn't exist.")
    if (!res.ok) throw new Error('Could not load the template. Please try again.')
    template.value = (await res.json() as { data: TemplateDetailResponse }).data
  } catch (e) {
    console.error('[TemplateDetailPage] load', e)
    error.value = e instanceof Error ? e.message : 'Could not load the template.'
  } finally {
    loading.value = false
  }
})
</script>

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

.td-about {
  margin: 0 0 1rem;
}

.td-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.td-subject {
  margin: 0;
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
