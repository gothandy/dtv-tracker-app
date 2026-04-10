<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>FyBarChart</h1>

      <h2>1-1-1 (middle)</h2>
      <LayoutColumns ratio="1-1-1">
        <template #middle>
          <CardTitle>Hours by year</CardTitle>
          <FyBarChart :sessions="store.sessions" v-model="selectedFy1" @click-selected="deselect1 = $event" />
        </template>
      </LayoutColumns>
      <p class="status">selected: <strong>{{ selectedFy1 || '—' }}</strong> | last selectedBarClick: <strong>{{ deselect1 || '—' }}</strong></p>

      <h2>2-1 (left)</h2>
      <LayoutColumns ratio="2-1">
        <template #left>
          <CardTitle>Hours by year</CardTitle>
          <FyBarChart :sessions="store.sessions" v-model="selectedFy2" @click-selected="deselect2 = $event" />
        </template>
      </LayoutColumns>
      <p class="status">selected: <strong>{{ selectedFy2 || '—' }}</strong> | last selectedBarClick: <strong>{{ deselect2 || '—' }}</strong></p>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import LayoutColumns from '../../components/LayoutColumns.vue'
import FyBarChart from '../../components/FyBarChart.vue'
import CardTitle from '../../components/CardTitle.vue'
import { useSessionListStore } from '../../stores/sessionList'

usePageTitle('Sandbox')

const store = useSessionListStore()
store.fetch()

const selectedFy1 = ref('')
const selectedFy2 = ref('')
const deselect1 = ref('')
const deselect2 = ref('')
</script>

<style scoped>
.status { font-size: 0.85rem; color: var(--color-text-muted); margin: 0; }
</style>
