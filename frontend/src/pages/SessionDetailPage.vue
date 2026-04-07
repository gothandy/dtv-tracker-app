<template>
  <DefaultLayout :padded="false">
    <h1 v-if="store.session" class="sr-only">{{ store.session.groupName }}, {{ formatDate(store.session.date) }}</h1>
    <div v-if="store.loading && !store.session" class="text-gray-400 p-6">Loading…</div>
    <div v-else-if="store.error" class="text-red-500 p-6">{{ store.error }}</div>
    <template v-else-if="store.session">
      <PageHeader>{{ store.session.groupName }}</PageHeader>

      <!-- TOP ROW -->
      <LayoutColumns ratio="2-1">

        <template #header>
          <SectionHeader :hidden="true">Session Details</SectionHeader>
        </template>

        <!-- Left: session info -->
        <template #left>
          <SessionDetailHeader :session="store.session" />
          
        </template>

        <!-- Right: booking panel -->
        <template #right>
          <ConcertinaLayout>
            <ConcertinaItem label="Check-In" v-if="profile.isOperational">
              <SessionDetailActions
                v-if="profile.isCheckIn || profile.isAdmin"
                :session="store.session"
                :group-key="(route.params.groupKey as string)"
                :date="store.session.date"
                @saved="(gk, d) => store.fetch(gk, d)"
              />
            </ConcertinaItem>
            <ConcertinaItem label="Book" v-if="store.session.isBookable && !store.session.isRegistered" >
              <SessionDetailBook :session="store.session" />
            </ConcertinaItem>
            <ConcertinaItem label="Cancel" v-if="store.session.isBookable && store.session.isRegistered">
            </ConcertinaItem>

          </ConcertinaLayout>


          <MediaCard v-if="coverItem" :item="coverItem" constrain="width" :selected="true" />
          <!--
          <SessionDetailForThis v-if="store.session.isBookable && store.session.isRegistered" :session="store.session" />
          -->


          
        </template>
      </LayoutColumns>

      

      <!-- SECOND ROW -->
       <!-- TODO display a different set of text depending on the session category (dig, fund raising, behind the scenes etc.) -->
      <LayoutColumns ratio="1-1-1" v-if="store.session.isBookable">
        <template #header>
          <SectionHeader >What to expect?</SectionHeader>
        </template>

        <template #left>
          <div class="p-6">
            <h3 class="text-dtv-dark text-xl leading-none mb-4">On the day</h3>
            <ul class="prose text-sm text-dtv-dark space-y-2 list-disc list-inside">
              <li>Follow anyone in a high-viz to the DTV containers.</li>
              <li>We start by sorting out tools and registration.</li>
              <li>Before we set off there will be a dig briefing to kick things off</li>
              <li>Then a bit of walk to where we'll be working.</li>
            </ul>
          </div>
        </template>

        <template #middle>
          <div class="p-6">
            <h3 class="text-dtv-dark text-xl leading-none mb-4">What to bring</h3>
            <ul class="prose text-sm text-dtv-dark space-y-2 list-disc list-inside">
              <li>Sturdy boots, steel toe caps are ideal.</li>
              <li>Gardening gloves great for picking up rocks.</li>
              <li>Clothes you don't mind getting muddy.</li>
              <li>Water, waterproofs and sun cream.</li>
              <li>We provide tools and hi-viz.</li>
            </ul>
          </div>
        </template>

        <template #right>
          <div class="p-6">
            <h3 class="text-dtv-dark text-xl leading-none mb-4">Your first time?</h3>
            <ul class="prose text-sm text-dtv-dark space-y-2 list-disc list-inside">
              <li>You'll get paired up with an experienced regular.</li>
              <li>All sorts of tasks available to suit your level of fitness.</li>
              <li>There is some paperwork needed at the beginning.</li>
              <li>Don't forget to have fun and work at your own pace.</li>
            </ul>
          </div>
        </template>

      </LayoutColumns>

      <LayoutColumns ratio="1-2" v-if="!store.session.isBookable || store.session.description !== null">

        <template #header>
          <SectionHeader v-if="!store.session.isBookable">What we got up to?</SectionHeader>
          <SectionHeader v-if="store.session.isBookable">What we got planned?</SectionHeader>
        </template>

        <template #left>
          <SessionDetailStats :session="store.session" :profile="profile.context" />
          <SessionDetailGroupTeaser
            v-if="!store.session.isBookable && store.session.nextSession"
            :group-name="store.session.groupName!"
            :group-description="store.session.groupDescription"
            :next-session="store.session.nextSession"
          />
        </template>

        <template #right>
          <CardTitle v-if="store.session.displayName">{{ store.session.displayName }}</CardTitle>
          <div v-if="store.session.description" class="prose px-6 pb-6">
            <p class="text-dtv-dark text-large leading-relaxed pb-4" style="white-space: pre-line">{{ store.session.description }}</p>
          
            <SessionDetailTags
              :session="store.session"
              :group-key="(route.params.groupKey as string)"
              :date="store.session.date"
              @updated="store.fetch(route.params.groupKey as string, store.session!.date)"
            />
          </div>
        </template>
      </LayoutColumns>

      <SessionDetailGallery
        :group-key="(route.params.groupKey as string)"
        :date="store.session.date"
        :show-edit-btn="profile.isCheckIn || profile.isAdmin"
        :cover-media-id="store.session.coverMediaId"
        @cover-item="coverItem = $event"
        @cover-changed="(id) => { if (store.session) store.session.coverMediaId = id }"
      />



      <!-- BOTTOM ROW -->
      <LayoutColumns ratio="2-1" :reverse="true" v-if="profile.isCheckIn || profile.isAdmin">
        <template #header><SectionHeader>Registrations and Check-in</SectionHeader></template>
        <template #left>
          <!-- Entries — checkin/admin only -->
          <SessionDetailEntries
            v-if="profile.isCheckIn || profile.isAdmin"
            :group-key="(route.params.groupKey as string)"
            :date="store.session.date"
          />
        </template>

        <template #right>

        </template>
      </LayoutColumns>









      <DebugData label="Session" :item="store.session!" />
      <DebugData v-if="profile.user" label="Profile" :item="profile.user" />
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { MediaItem } from '../types/media'
import { useRoute } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import DebugData from '../components/DebugData.vue'
import { useSessionDetailStore } from '../stores/sessionDetail'
import { useProfile } from '../composables/useProfile'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'
import SessionDetailLogin from '../components/sessions/SessionDetailLogin.vue'
import SessionDetailBook from '../components/sessions/SessionDetailBook.vue'
import MediaCard from '../components/MediaCard.vue'
import SessionDetailHeader from '../components/sessions/SessionDetailHeader.vue'
import SessionDetailStats from '../components/sessions/SessionDetailStats.vue'
import SessionDetailGroupTeaser from '../components/sessions/SessionDetailGroupTeaser.vue'
import SessionDetailGallery from '../components/sessions/SessionDetailGallery.vue'
import SessionDetailForThis from '../components/sessions/SessionDetailForThis.vue'
import SessionDetailTags from '../components/sessions/SessionDetailTags.vue'
import SessionDetailActions from '../components/sessions/SessionDetailActions.vue'
import SessionDetailEntries from '../components/sessions/SessionDetailEntries.vue'
import SectionHeader from '../components/SectionHeader.vue'
import CardTitle from '../components/CardTitle.vue'
import ConcertinaLayout from '../components/ConcertinaLayout.vue'
import ConcertinaItem from '../components/ConcertinaItem.vue'

const route = useRoute()
const store = useSessionDetailStore()
const profile = useProfile()
const coverItem = ref<MediaItem | null>(null)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const titleText = computed(() => {
  if (!store.session) return ''
  return `${formatDate(store.session.date)} | ${store.session.groupName}`
})
usePageTitle(titleText)


function load() {
  store.fetch(route.params.groupKey as string, route.params.date as string)
}

onMounted(load)
watch(() => [route.params.groupKey, route.params.date], load)
</script>
