<template>
  <DefaultLayout :padded="false">
    <div v-if="store.loading" class="text-gray-400 p-6">Loading…</div>
    <div v-else-if="store.error" class="text-red-500 p-6">{{ store.error }}</div>
    <template v-else-if="store.session">
      <LayoutColumns ratio="2-1">
        <!-- Left: session info -->
        <template #left>
          <div class="p-6">
            <h1 class="font-display text-dtv-dark text-4xl uppercase leading-none mb-4">
              {{ store.session.groupName }}
            </h1>

            <dl class="text-sm text-dtv-dark space-y-1 mb-6">
              <div class="flex gap-3">
                <dt class="text-gray-400 w-20 shrink-0">Date</dt>
                <dd>{{ formatDate(store.session.date) }}</dd>
              </div>
              <div class="flex gap-3">
                <dt class="text-gray-400 w-20 shrink-0">Time</dt>
                <dd>9:30 to 12:30 (3h)</dd><!-- TODO: add time field to API -->
              </div>
              <div class="flex gap-3">
                <dt class="text-gray-400 w-20 shrink-0">Location</dt>
                <dd>Forest of Dean Cycle Centre</dd><!-- TODO: add location field to API -->
              </div>
            </dl>

            <p v-if="store.session.groupDescription" class="text-dtv-dark text-sm leading-relaxed">
              {{ store.session.groupDescription }}
            </p>

            
          </div>
        </template>

        <!-- Right: booking panel -->
        <template #right>
          <div class="p-6 flex flex-col">

            <!-- Days to go — only within 15 days -->
            <p v-if="daysToGo !== null" class="bg-dtv-green/50 text-center text-dtv-dark text-sm font-bold uppercase tracking-wide py-4 px-6 self-start w-fit ml-12">
              {{ daysToGo }} days to go
            </p>

            <!-- Book button -->
            <button class="bg-dtv-green text-white font-body text-lg uppercase tracking-wide py-4 px-8 self-center cursor-pointer hover:bg-dtv-green/80 transition-colors">
              Book your spot
            </button>

            <!-- Spaces left -->
            <div class="bg-dtv-dark text-white py-3 px-4 flex items-center justify-center self-end w-fit mr-12">
              <span class="font-body text-2xl leading-none">{{ spacesLeft }}</span>
              <span class="text-sm uppercase tracking-wide ml-2">Spaces Left</span>
            </div>

            <p class="text-gray-400 text-xs leading-snug text-center mt-4">
              First time? We'll show you what to do.
            </p>

          </div>
        </template>
      </LayoutColumns>

      <!-- Second row: about / description / returning volunteer -->
      <LayoutColumns ratio="2-1">
        <!-- Left: about digging -->
        <template #left>
          <div class="p-6">
            <h2 class="font-display text-dtv-dark text-xl uppercase leading-none mb-4">What to Expect</h2>
            <ul class="text-sm text-dtv-dark space-y-2 list-disc list-inside">
              <li>Bring sturdy boots, gardening gloves, water, clothes you don't mind getting muddy and good vibes.</li>
              <li>We provide all tools, hi-viz, training and help on the day.</li>
              <li>Volunteers get free parking. Just remember your registration number.</li>
              <li>Expect a dig briefing to kick things off, some paper work for first timers and a bit of walk to where we'll be working.</li>
            </ul>
          </div>
        </template>

        <!-- Right: returning volunteer -->
        <template #right>
          <div class="p-6 flex flex-col items-end">

              <p class="text-dtv-dark text-sm mb-2 self-start">Already volunteered with us?</p>

              <button class="bg-dtv-dark text-dtv-green font-body text-sm uppercase tracking-wide p-3 w-fit cursor-pointer hover:bg-dtv-dark/80 transition-colors">
                Log in to book faster
              </button>

          </div>
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

const route = useRoute()
const store = useSessionDetailStore()

const spacesLeft = computed(() =>
  store.session ? store.session.spacesAvailable - store.session.registrations : 0
)

const daysToGo = computed(() => {
  if (!store.session) return null
  const diff = Math.ceil((new Date(store.session.date).getTime() - Date.now()) / 86_400_000)
  return diff >= 0 && diff <= 15 ? diff : null
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function load() {
  store.fetch(route.params.groupKey as string, route.params.date as string)
}

onMounted(load)
watch(() => [route.params.groupKey, route.params.date], load)
</script>
