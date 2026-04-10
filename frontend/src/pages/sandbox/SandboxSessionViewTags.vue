<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>SessionViewTags</h1>

      <h2>Read-only (allowEdit: false)</h2>
      <LayoutColumns ratio="2-1">
        <template #left>
          <div class="p-6">
            <SessionViewTags
              :session="{ ...baseSession, metadata: deepTags }"
              :allow-edit="false"
              :working="false"
              :tree="taxonomyTree"
              :taxonomy-loading="taxonomyLoading"
            />
          </div>
        </template>
      </LayoutColumns>

      <h2>Editable (allowEdit: true)</h2>
      <p class="note">saveTags is handled locally — no API call. Last emit shown below.</p>
      <LayoutColumns ratio="2-1">
        <template #left>
          <div class="p-6">
            <SessionViewTags
              :session="{ ...baseSession, metadata: editableTags }"
              :allow-edit="true"
              :working="false"
              :tree="taxonomyTree"
              :taxonomy-loading="taxonomyLoading"
              @save-tags="onSaveTags"
            />
          </div>
          <p class="note">Last saveTags emit: <strong>{{ lastEmit || '—' }}</strong></p>
        </template>
      </LayoutColumns>

      <h2>With error</h2>
      <LayoutColumns ratio="2-1">
        <template #left>
          <div class="p-6">
            <SessionViewTags
              :session="{ ...baseSession, metadata: deepTags }"
              :allow-edit="true"
              :working="false"
              :tree="taxonomyTree"
              :taxonomy-loading="taxonomyLoading"
              error="Failed to save tags — please try again"
            />
          </div>
        </template>
      </LayoutColumns>

      <h2>Edge case: parent + child both in metadata</h2>
      <p class="note">Both [Verderers] and [Red Option] should show a delete button.</p>
      <LayoutColumns ratio="2-1">
        <template #left>
          <div class="p-6">
            <SessionViewTags
              :session="{ ...baseSession, metadata: overlapTags }"
              :allow-edit="true"
              :working="false"
              :tree="taxonomyTree"
              :taxonomy-loading="taxonomyLoading"
            />
          </div>
        </template>
      </LayoutColumns>

      <h2>Empty — read-only</h2>
      <LayoutColumns ratio="2-1">
        <template #left>
          <div class="p-6">
            <SessionViewTags
              :session="{ ...baseSession, metadata: [] }"
              :allow-edit="false"
              :working="false"
              :tree="taxonomyTree"
              :taxonomy-loading="taxonomyLoading"
            />
            <p class="note">(nothing rendered — div hidden when no tags and allowEdit false)</p>
          </div>
        </template>
      </LayoutColumns>

      <h2>Empty — with edit</h2>
      <LayoutColumns ratio="2-1">
        <template #left>
          <div class="p-6">
            <SessionViewTags
              :session="{ ...baseSession, metadata: [] }"
              :allow-edit="true"
              :working="false"
              :tree="taxonomyTree"
              :taxonomy-loading="taxonomyLoading"
            />
          </div>
        </template>
      </LayoutColumns>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import LayoutColumns from '../../components/LayoutColumns.vue'
import SessionViewTags from '../../components/sessions/SessionViewTags.vue'
import { useTaxonomy } from '../../composables/useTaxonomy'
import { ref } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { SessionDetailResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')
const { tree: taxonomyTree, loading: taxonomyLoading } = useTaxonomy()

// Minimal session shell — SessionViewTags only reads `metadata`
const baseSession = {
  id: 1,
  date: '2025-06-01',
  groupName: 'XC Crew',
  groupKey: 'xc',
  isBookable: false,
  isRegistered: false,
  isAttended: false,
  isRegular: false,
  entries: [],
} as unknown as SessionDetailResponse

const deepTags = [
  { label: 'XC:Verderers:Red Option', termGuid: 'guid-red-option' },
  { label: 'Skills:Red Skills', termGuid: 'guid-red-skills' },
  { label: 'XC:Freeminers:Boneyard', termGuid: 'guid-boneyard' },
]

const editableTags = ref([
  { label: 'XC:Verderers:Red Option', termGuid: 'guid-red-option' },
  { label: 'Skills:Red Skills', termGuid: 'guid-red-skills' },
])

const lastEmit = ref('')
function onSaveTags(tags: Array<{ label: string; termGuid: string }>) {
  editableTags.value = tags
  lastEmit.value = tags.map(t => t.label).join(', ') || '(empty)'
}

// Parent + child both in metadata — both should be deletable
const overlapTags = [
  { label: 'XC:Verderers', termGuid: 'guid-verderers' },
  { label: 'XC:Verderers:Red Option', termGuid: 'guid-red-option' },
]
</script>

<style scoped>
.note { font-size: 0.85rem; color: var(--color-text-muted); padding: 0 1.5rem 1rem; }
</style>
