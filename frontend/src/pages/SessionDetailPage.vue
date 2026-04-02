<template>
  <DefaultLayout :padded="false">
    <h1 v-if="store.session" class="sr-only">{{ store.session.groupName }}, {{ formatDate(store.session.date) }}</h1>
    <div v-if="store.loading" class="text-gray-400 p-6">Loading…</div>
    <div v-else-if="store.error" class="text-red-500 p-6">{{ store.error }}</div>
    <template v-else-if="store.session">
      <PageTitle>{{ store.session.groupName }}</PageTitle>
      <LayoutColumns ratio="2-1">
        <!-- Left: session info -->
        <template #left>
          <SessionDetailHeader :session="store.session" />
        </template>

        <!-- Right: booking panel -->
        <template #right>
          <SessionDetailCover v-if="store.session.coverMediaId" :group-key="(route.params.groupKey as string)" :date="store.session.date" :alt="store.session.groupName" />
          <SessionDetailBook v-if="isBookable && !store.session.isRegistered" :session="store.session" />
          <SessionDetailForThis v-if="isBookable && store.session.isRegistered" :session="store.session" />
        </template>
      </LayoutColumns>

      <!-- Second row: about / description / returning volunteer -->
      <LayoutColumns ratio="2-1">

        <!-- What to Expect / Write Up -->
        <template #left>
          <SessionDetailExpect v-if="isBookable" />
          <SessionDetailWriteUp v-if="!isBookable && store.session.description" :description="store.session.description!" />
        </template>

        <!-- Returning Volunteer / Stats -->
        <template #right>
          <SessionDetailLogin v-if="isBookable && !user" />
          <SessionDetailStats v-if="!isBookable" :session="store.session" />
          <SessionDetailGroupTeaser
            v-if="!isBookable && store.session.nextSession"
            :group-name="store.session.groupName!"
            :group-description="store.session.groupDescription"
            :next-session="store.session.nextSession"
          />
        </template>
      </LayoutColumns>

      <!-- Tags — visible to all -->
      <SessionDetailTags
        :session="store.session"
        :group-key="(route.params.groupKey as string)"
        :date="store.session.date"
        @updated="store.fetch(route.params.groupKey as string, store.session!.date)"
      />

      <!-- Action buttons — upload/edit for checkin/admin/self-service -->
      <SessionDetailActions
        v-if="isCheckIn || isAdmin || isSelfService"
        :session="store.session"
        :group-key="(route.params.groupKey as string)"
        :date="store.session.date"
        @saved="(gk, d) => store.fetch(gk, d)"
      />

      <!-- Entries — checkin/admin only -->
      <SessionDetailEntries
        v-if="isCheckIn || isAdmin"
        :group-key="(route.params.groupKey as string)"
        :date="store.session.date"
      />

      <SessionDetailGallery
        :group-key="(route.params.groupKey as string)"
        :date="store.session.date"
        :max-height="400"
      />

      <DebugData :item="store.session!" />
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
import { useRole } from '../composables/useRole'
import { usePageTitle } from '../composables/usePageTitle'
import PageTitle from '../components/PageTitle.vue'
import SessionDetailLogin from '../components/sessions/SessionDetailLogin.vue'
import SessionDetailBook from '../components/sessions/SessionDetailBook.vue'
import SessionDetailExpect from '../components/sessions/SessionDetailExpect.vue'
import SessionDetailCover from '../components/sessions/SessionDetailCover.vue'
import SessionDetailWriteUp from '../components/sessions/SessionDetailWriteUp.vue'
import SessionDetailHeader from '../components/sessions/SessionDetailHeader.vue'
import SessionDetailStats from '../components/sessions/SessionDetailStats.vue'
import SessionDetailGroupTeaser from '../components/sessions/SessionDetailGroupTeaser.vue'
import SessionDetailGallery from '../components/sessions/SessionDetailGallery.vue'
import SessionDetailForThis from '../components/sessions/SessionDetailForThis.vue'
import SessionDetailTags from '../components/sessions/SessionDetailTags.vue'
import SessionDetailActions from '../components/sessions/SessionDetailActions.vue'
import SessionDetailEntries from '../components/sessions/SessionDetailEntries.vue'

const route = useRoute()
const store = useSessionDetailStore()
const { user } = useAuth()
const { isAdmin, isCheckIn, isSelfService } = useRole()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const titleText = computed(() => {
  if (!store.session) return ''
  return `${formatDate(store.session.date)} | ${store.session.groupName}`
})
usePageTitle(titleText)

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
