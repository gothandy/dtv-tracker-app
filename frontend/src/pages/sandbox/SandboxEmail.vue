<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Email templates</h1>
      <p>Each template from the Templates list, rendered with made-up data for its context.</p>

      <select v-model="templateKey" class="picker">
        <option value="" disabled>Select template…</option>
        <option v-for="t in templates" :key="`${t.context}-${t.id}`" :value="`${t.context}-${t.id}`">
          {{ t.context }}: {{ t.title }}
        </option>
      </select>

      <template v-if="rendered">
        <section class="panel">
          <h2>Subject</h2>
          <p class="subject">{{ rendered.subject }}</p>
        </section>

        <section class="panel">
          <h2>Text</h2>
          <pre class="text-body">{{ rendered.text }}</pre>
        </section>

        <section class="panel">
          <h2>HTML</h2>
          <div class="html-body" v-html="rendered.html" />
        </section>
      </template>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="loading">Loading…</p>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref, watch, onMounted } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import type { TemplateResponse } from '../../../../types/api-responses'
import type { TemplateContext } from '../../../../types/email-template'

usePageTitle('Sandbox — Email templates')

/** Made-up variables for each context, as the server builds them for a real send. */
const FIXTURES: Record<TemplateContext, Record<string, unknown>> = {
  Session: {
    baseUrl: 'http://localhost:3000',
    volunteerName: 'Alice Example',
    groupName: 'Sheepskull',
    sessionUrl: 'http://localhost:3000/sessions/sheepskull/2026-04-23',
    sessionTitle: 'Spring Conservation Day',
    formattedDateShort: '23 April',
    formattedDateLong: 'Thursday, 23 April 2026',
    formattedTime: '9:30 to 12:30 (about 3 hours)',
    description: 'Meet at the usual car park.\nBring waterproofs.',
    tags: '#DH #Sheepskull #Endo',
    myChildNames: 'Ben Example',
    isRegular: true,
    isMember: true,
    loginUrl: 'http://localhost:3000/login?returnTo=/sessions/sheepskull/2026-04-23',
  },
  Profile: {
    baseUrl: 'http://localhost:3000',
    name: 'Alice Example',
    email: 'alice@example.com',
    loginUrl: 'http://localhost:3000/login?email=alice%40example.com',
    charityMembershipDate: '1 April 2024',
  },
}

interface RenderedEmail {
  subject: string
  html: string
  text: string
}

const templates = ref<TemplateResponse[]>([])
const templateKey = ref('')
const rendered = ref<RenderedEmail | null>(null)
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const lists = await Promise.all((Object.keys(FIXTURES) as TemplateContext[]).map(async context => {
      const res = await fetch(`/api/templates?context=${context}`)
      if (!res.ok) throw new Error(`Could not load templates (${res.status})`)
      return (await res.json() as { data: TemplateResponse[] }).data
    }))
    templates.value = lists.flat()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load templates'
  } finally {
    loading.value = false
  }
})

watch(templateKey, async key => {
  const template = templates.value.find(t => `${t.context}-${t.id}` === key)
  if (!template) return
  rendered.value = null
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('/api/email/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: template.id, vars: FIXTURES[template.context] }),
    })
    const body = await res.json().catch(() => ({ error: res.statusText }))
    if (!res.ok) throw new Error(body.error ?? 'Render failed')
    rendered.value = body
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Render failed'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.picker {
  margin-bottom: 2rem;
  padding: 0.4rem 0.5rem;
  font: inherit;
}

.panel {
  margin-bottom: 2rem;
}

.subject {
  padding: 0.75rem 1rem;
  background: var(--color-dtv-light);
  border-radius: 4px;
  font-size: 1rem;
  margin: 0;
}

.text-body {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.85rem;
  padding: 1rem;
  background: var(--color-dtv-light);
  border-radius: 4px;
  margin: 0;
}

.html-body {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.error {
  color: red;
}
</style>
