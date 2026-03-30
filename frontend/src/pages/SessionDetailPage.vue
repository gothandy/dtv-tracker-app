<template>
  <DefaultLayout :padded="false">
    <div v-if="store.loading" class="text-gray-400 p-6">Loading…</div>
    <div v-else-if="store.error" class="text-red-500 p-6">{{ store.error }}</div>
    <template v-else-if="store.session">
      <LayoutColumns ratio="2-1">
        <!-- Left: session info -->
        <template #left>
          <SessionHeaderCard :session="store.session" />
        </template>

        <!-- Right: booking panel -->
        <template #right>
          <CoverPhotoCard v-if="store.session.coverMediaId" :group-key="(route.params.groupKey as string)" :date="store.session.date" :alt="store.session.groupName" />
          <BookCard v-if="isBookable && !store.session.isRegistered" :session="store.session" />
        </template>
      </LayoutColumns>

      <!-- Second row: about / description / returning volunteer -->
      <LayoutColumns ratio="2-1">

        <!-- What to Expect / Write Up -->
        <template #left>
          <WhatToExpectCard v-if="isBookable" />
          <WriteUpCard v-if="!isBookable && store.session.description" :description="store.session.description!" />
        </template>

        <!-- Returning Volunteer / Stats -->
        <template #right>
          <LoginToBookCard v-if="isBookable && !user" />
          <SessionStatsCard v-if="!isBookable" :session="store.session" />
          <GroupTeaserCard
            v-if="!isBookable && store.session.nextSession"
            :group-name="store.session.groupName!"
            :group-description="store.session.groupDescription"
            :next-session="store.session.nextSession"
          />
        </template>
      </LayoutColumns>

      <DebugData :item="store.session as unknown as Record<string, unknown>" class="p-6" />
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import DebugData from '../components/DebugData.vue'
import { useSessionDetailStore } from '../stores/sessionDetail'
import { useAuth } from '../composables/useAuth'
import LoginToBookCard from './sessions/LoginToBookCard.vue'
import BookCard from './sessions/BookCard.vue'
import WhatToExpectCard from './sessions/WhatToExpectCard.vue'
import CoverPhotoCard from './sessions/CoverPhotoCard.vue'
import WriteUpCard from './sessions/WriteUpCard.vue'
import SessionHeaderCard from './sessions/SessionHeaderCard.vue'
import SessionStatsCard from './sessions/SessionStatsCard.vue'
import GroupTeaserCard from './sessions/GroupTeaserCard.vue'

const route = useRoute()
const store = useSessionDetailStore()
const { user } = useAuth()

// Open on day of session, closed from next day onwards (time field TBD)
const isBookable = computed(() => {
  if (!store.session) return false
  const today = new Date().toISOString().slice(0, 10)
  return store.session.date >= today
})


function load() {
  store.fetch(route.params.groupKey as string, route.params.date as string)
}

onMounted(load)
watch(() => [route.params.groupKey, route.params.date], load)
</script>
