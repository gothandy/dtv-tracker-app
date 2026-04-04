<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>FyBarChart</h1>

      <h2>1-1-1 (middle)</h2>
      <LayoutColumns ratio="1-1-1">
        <template #middle>
          <CardTitle>Hours by year</CardTitle>
          <FyBarChart :sessions="store.sessions" v-model="selectedFy1" />
        </template>
      </LayoutColumns>

      <h2>2-1 (left)</h2>
      <LayoutColumns ratio="2-1">
        <template #left>
          <CardTitle>Hours by year</CardTitle>
          <FyBarChart :sessions="store.sessions" v-model="selectedFy2" />
        </template>
      </LayoutColumns>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import LayoutColumns from '../../components/LayoutColumns.vue'
import FyBarChart from '../../components/FyBarChart.vue'
import CardTitle from '../../components/CardTitle.vue'
import { useSessionsStore } from '../../stores/sessions'

usePageTitle('Sandbox')

const store = useSessionsStore()
store.fetch()

const selectedFy1 = ref('')
const selectedFy2 = ref('')
</script>

<style scoped>
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back { color: var(--color-dtv-green); text-decoration: none; font-size: 0.9rem; }
.back:hover { text-decoration: underline; }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

h2 { font-size: 1rem; font-weight: 600; color: var(--color-text-muted); }
</style>
