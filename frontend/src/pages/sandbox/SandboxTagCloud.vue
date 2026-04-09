<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>TagCloud</h1>

      <h2>2-1 (left)</h2>
      <LayoutColumns ratio="2-1">
        <template #left>
          <CardTitle>Activity</CardTitle>
          <TagCloud :tags="sampleTags" @click="onSelect" />
        </template>
      </LayoutColumns>
      <p class="selected">last click: <strong>{{ lastLabel || '—' }}</strong></p>

      <h2>1-1-1 (middle)</h2>
      <LayoutColumns ratio="1-1-1">
        <template #middle>
          <CardTitle>Activity</CardTitle>
          <TagCloud :tags="sampleTags" />
        </template>
      </LayoutColumns>

      <h2>Empty state</h2>
      <LayoutColumns ratio="2-1">
        <template #right>
          <CardTitle>Activity</CardTitle>
          <TagCloud :tags="[]" />
        </template>
      </LayoutColumns>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import LayoutColumns from '../../components/LayoutColumns.vue'
import TagCloud from '../../components/TagCloud.vue'
import CardTitle from '../../components/CardTitle.vue'
import { ref } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { TagHoursItem } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const selected = ref('')
const lastLabel = ref('')
function onSelect(_termGuid: string, label: string) { selected.value = label; lastLabel.value = label }

const sampleTags: TagHoursItem[] = [
  { label: 'DH', hours: 420, depth: 0, termGuid: 'guid-dh' },
  { label: 'DH:Sheepskull', hours: 210, depth: 1, termGuid: 'guid-sheepskull' },
  { label: 'DH:Sheepskull:Top', hours: 130, depth: 2, termGuid: 'guid-top' },
  { label: 'DH:Corkscrew', hours: 95, depth: 1, termGuid: 'guid-corkscrew' },
  { label: 'Enduro', hours: 310, depth: 0, termGuid: 'guid-enduro' },
  { label: 'Enduro:Flow', hours: 185, depth: 1, termGuid: 'guid-flow' },
  { label: 'Enduro:Rock Garden', hours: 120, depth: 1, termGuid: 'guid-rockgarden' },
  { label: 'XC', hours: 240, depth: 0, termGuid: 'guid-xc' },
  { label: 'XC:Singletrack', hours: 160, depth: 1, termGuid: 'guid-singletrack' },
  { label: 'Jump Park', hours: 175, depth: 0, termGuid: 'guid-jumppark' },
  { label: 'Jump Park:Beginners', hours: 90, depth: 1, termGuid: 'guid-beginners' },
  { label: 'Skills Area', hours: 80, depth: 0, termGuid: 'guid-skills' },
]
</script>

<style scoped>
.selected { font-size: 0.85rem; color: var(--color-text-muted); }
</style>
