<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>RegularList</h1>

      <h2>Profile context — Admin toggle (groups the volunteer attends)</h2>
      <div class="demo">
        <RegularList
          :items="profileItems"
          :allow-toggle-regular="true"
          :working-slug="workingSlug"
          :error="error"
          ref="listRef"
          @add-regular="onAdd"
          @remove-regular="onRemove"
        />
      </div>

      <h2>Group context — Admin toggle (volunteers who attend the group)</h2>
      <div class="demo">
        <RegularList
          :items="groupItems"
          :allow-toggle-regular="true"
          :working-slug="workingSlugGroup"
          :error="errorGroup"
          @add-regular="onAddGroup"
          @remove-regular="onRemoveGroup"
        />
      </div>

      <h2>Read-only — regular badges, no toggle</h2>
      <div class="demo">
        <RegularList :items="profileItems" />
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
const workingSlugGroup = ref<string | undefined>(undefined)
const errorGroup = ref('')

function log(msg: string) {
  events.value.unshift(msg)
}

const FAIL_SLUG = 'dig-deep'

// Profile context: items are groups
const profileItems = reactive<RegularListItem[]>([
  { slug: 'sheepskull', name: 'Sheepskull', linkTo: '/groups/sheepskull', hours: 40, isRegular: true, regularId: 101 },
  { slug: 'dig-deep', name: 'Dig Deep', linkTo: '/groups/dig-deep', hours: 6, isRegular: false },
  { slug: 'riverside', name: 'Riverside Crew', linkTo: '/groups/riverside', hours: 14, isRegular: false },
])

function onAdd(slug: string) {
  log(`addRegular slug=${slug}`)
  workingSlug.value = slug
  error.value = ''
  setTimeout(() => {
    if (slug === FAIL_SLUG) {
      error.value = 'Failed to add regular — please try again'
      log(`addRegular slug=${slug} — FAILED`)
    } else {
      const item = profileItems.find(i => i.slug === slug)
      if (item) { item.isRegular = true; item.regularId = 999 }
      log(`addRegular slug=${slug} — OK`)
    }
    workingSlug.value = undefined
  }, 1000)
}

function onRemove(slug: string) {
  log(`removeRegular slug=${slug}`)
  workingSlug.value = slug
  error.value = ''
  setTimeout(() => {
    if (slug === FAIL_SLUG) {
      error.value = 'Failed to remove regular — please try again'
      log(`removeRegular slug=${slug} — FAILED`)
    } else {
      const item = profileItems.find(i => i.slug === slug)
      if (item) { item.isRegular = false; item.regularId = undefined }
      log(`removeRegular slug=${slug} — OK`)
    }
    workingSlug.value = undefined
  }, 1000)
}

// Group context: items are profiles
const groupItems = reactive<RegularListItem[]>([
  { slug: 'jane-smith-42', name: 'Jane Smith', linkTo: '/profiles/jane-smith-42', hours: 24, isRegular: true, regularId: 201 },
  { slug: 'bob-jones-15', name: 'Bob Jones', linkTo: '/profiles/bob-jones-15', hours: 12, isRegular: false },
  { slug: 'alice-brown-7', name: 'Alice Brown', linkTo: '/profiles/alice-brown-7', hours: 8, isRegular: true, regularId: 202 },
])

function onAddGroup(slug: string) {
  log(`[group] addRegular slug=${slug}`)
  workingSlugGroup.value = slug
  errorGroup.value = ''
  setTimeout(() => {
    const item = groupItems.find(i => i.slug === slug)
    if (item) { item.isRegular = true; item.regularId = 999 }
    log(`[group] addRegular slug=${slug} — OK`)
    workingSlugGroup.value = undefined
  }, 1000)
}

function onRemoveGroup(slug: string) {
  log(`[group] removeRegular slug=${slug}`)
  workingSlugGroup.value = slug
  errorGroup.value = ''
  setTimeout(() => {
    const item = groupItems.find(i => i.slug === slug)
    if (item) { item.isRegular = false; item.regularId = undefined }
    log(`[group] removeRegular slug=${slug} — OK`)
    workingSlugGroup.value = undefined
  }, 1000)
}
</script>
