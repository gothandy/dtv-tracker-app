<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Email: Pre-session</h1>

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

      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else>Loading…</p>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref, onMounted } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'

usePageTitle('Sandbox — Email: Pre-session')

const FIXTURE: Record<string, unknown> = {
  volunteerName: 'Alice Example',
  groupName: 'Sheepskull',
  sessionTitle: 'Spring Conservation Day',
  formattedDateShort: '23 April',
  formattedDateLong: 'Wednesday, 23 April 2026',
  description: 'Meet at the usual car park.<br>Bring waterproofs.',
  sessionUrl: 'http://localhost:3000/sessions/sheepskull/2026-04-23',
  loginUrl: 'http://localhost:3000/login?returnTo=/sessions/sheepskull/2026-04-23',
  myChildNames: 'Ben Example',
  isRegular: true,
  tags: '#DH #Sheepskull #Endo',
}

interface RenderedEmail {
  subject: string
  html: string
  text: string
}

const rendered = ref<RenderedEmail | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  const res = await fetch('/api/email/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: 'pre-session', vars: FIXTURE }),
  })
  if (res.ok) {
    rendered.value = await res.json()
  } else {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    error.value = body.error ?? 'Render failed'
  }
})
</script>

<style scoped>
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
