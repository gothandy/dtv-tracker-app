<template>
  <DefaultLayout>
    <div class="m-4">
      <h1 class="text-dtv-green text-3xl uppercase mb-8">About</h1>

      <div class="space-y-3 text-black">
        <div class="flex gap-3">
          <span class="font-bold w-24 shrink-0">App</span>
          <span>DTV Tracker App</span>
        </div>
        <div class="flex gap-3">
          <span class="font-bold w-24 shrink-0">Build</span>
          <span>{{ build }}</span>
        </div>
        <div class="flex gap-3">
          <span class="font-bold w-24 shrink-0">GitHub</span>
          <a v-if="commit" :href="`https://github.com/gothandy/dtv-tracker-app/commit/${commitFull}`"
            target="_blank" rel="noopener"
            class="text-dtv-green hover:underline">{{ commit }}</a>
          <span v-else>—</span>
        </div>
        <div class="flex gap-3">
          <span class="font-bold w-24 shrink-0">Contact</span>
          <a href="mailto:admin@deantrailvolunteers.org.uk" class="text-dtv-green hover:underline truncate min-w-0">admin@deantrailvolunteers.org.uk</a>
        </div>
        <div class="flex gap-3">
          <span class="font-bold w-24 shrink-0">Licence</span>
          <a href="https://github.com/gothandy/dtv-tracker-app/blob/main/LICENSE"
            target="_blank" rel="noopener"
            class="text-dtv-green hover:underline">MIT</a>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import DefaultLayout from '../layouts/DefaultLayout.vue'

declare const __BUILD_TIME__: string
declare const __GIT_COMMIT__: string

const d = new Date(__BUILD_TIME__)
const pad = (n: number) => String(n).padStart(2, '0')
const build = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`

const commitFull = __GIT_COMMIT__
const commit = commitFull ? commitFull.slice(0, 7) : null
</script>
