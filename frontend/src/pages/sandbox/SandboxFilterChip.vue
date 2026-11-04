<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>FilterChip</h1>
      <p class="sandbox-warning">Static mocked data — no API calls.</p>

      <h2>Default</h2>
      <div class="demo">
        <FilterChip label="Alice Bowen" @clear="log('clear: Alice Bowen')" />
      </div>

      <h2>Long label</h2>
      <div class="demo">
        <FilterChip label="Forest of Dean Mountain Bike Club Juniors" @clear="log('clear: long label')" />
      </div>

      <h2>In a filter bar</h2>
      <div class="list-filter">
        <select class="list-filter-select"><option>All record types</option></select>
        <select class="list-filter-select"><option>All statuses</option></select>
        <FilterChip label="Alice Bowen" @clear="log('clear: in filter bar')" />
      </div>

      <h2>Event log</h2>
      <div class="event-log">
        <div v-if="!events.length" class="event-log-empty">No events yet.</div>
        <div v-for="(e, i) in events" :key="i">{{ e }}</div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import FilterChip from '../../components/FilterChip.vue'
import { usePageTitle } from '../../composables/usePageTitle'

usePageTitle('Sandbox')

const events = ref<string[]>([])
function log(msg: string) {
  events.value.unshift(msg)
}
</script>
