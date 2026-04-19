<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Email: Pre-session</h1>

      <h2>Header</h2>
      <dl class="email-header">
        <dt>To</dt><dd>{{ fixture?.volunteerName }} &lt;volunteer@example.com&gt;</dd>
        <dt>Subject</dt><dd>{{ fixture?.groupName }} details for {{ fixture?.formattedDateShort }}</dd>
      </dl>

      <h2>Body</h2>
      <iframe src="/api/email/sandbox/pre-session" class="email-frame" title="Pre-session email body" />

      <DebugData v-if="fixture" :item="fixture" label="Fixture data" />
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref, onMounted } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import DebugData from '../../components/DebugData.vue'

usePageTitle('Sandbox — Email: Pre-session')

const fixture = ref<Record<string, unknown> | null>(null)

onMounted(async () => {
  const res = await fetch('/api/email/sandbox/pre-session?format=json')
  if (res.ok) fixture.value = await res.json()
})
</script>

<style scoped>
.email-header {
  display: grid;
  grid-template-columns: 4rem 1fr;
  gap: 0.25rem 1rem;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-dtv-light);
  border-radius: 4px;
}

.email-header dt {
  color: var(--color-dtv-dark);
  opacity: 0.5;
  font-weight: 600;
}

.email-frame {
  width: 100%;
  height: 700px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 1rem;
}
</style>
