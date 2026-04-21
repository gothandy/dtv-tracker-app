<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>RegularList</h1>

      <h2>Group context — volunteers (click to edit)</h2>
      <div class="demo">
        <RegularList
          :items="groupItems"
          :working-slug="workingSlug"
          :error="error"
          @edit-regular="onEdit"
        />
      </div>

      <h2>With a child regular (dashed border)</h2>
      <div class="demo">
        <RegularList
          :items="groupWithChildItems"
          @edit-regular="onEdit"
        />
      </div>

      <h2>Empty state</h2>
      <div class="demo">
        <RegularList :items="[]" />
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
import { ref, reactive } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import RegularList from '../../components/RegularList.vue'
import type { RegularListItem } from '../../components/RegularList.vue'

usePageTitle('Sandbox')

const events = ref<string[]>([])
const workingSlug = ref<string | undefined>(undefined)
const error = ref('')

function log(msg: string) {
  events.value.unshift(msg)
}

const groupItems = reactive<RegularListItem[]>([
  { profileId: 42, slug: 'jane-smith-42', name: 'Jane Smith', hours: 24, isRegular: true, regularId: 201 },
  { profileId: 15, slug: 'bob-jones-15', name: 'Bob Jones', hours: 12, isRegular: false },
  { profileId: 7, slug: 'alice-brown-7', name: 'Alice Brown', hours: 8, isRegular: true, regularId: 202 },
])

const groupWithChildItems = reactive<RegularListItem[]>([
  { profileId: 42, slug: 'jane-smith-42', name: 'Jane Smith', hours: 24, isRegular: true, regularId: 201 },
  { profileId: 88, slug: 'mini-digger-88', name: 'Mini Digger', hours: 10, isRegular: true, regularId: 203, accompanyingAdultId: 42 },
])

function onEdit(slug: string) {
  log(`editRegular slug=${slug}`)
  workingSlug.value = slug
  setTimeout(() => {
    log(`editRegular slug=${slug} — modal would open`)
    workingSlug.value = undefined
  }, 600)
}
</script>
