<template>
  <DefaultLayout>
    <div class="pt-8">
      <SessionsFilterV1 :sessions="store.sessions" @filtered="filtered = $event" />
      <SessionActionsV1 :sessions="filtered" v-model:selected="selected" @tagged="store.fetch()" />
      <SessionResultsV1 :sessions="filtered" :loading="store.loading" v-model:selected="selected" />
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import SessionsFilterV1 from '../components/SessionsFilterV1.vue'
import SessionActionsV1 from '../components/SessionActionsV1.vue'
import SessionResultsV1 from '../components/SessionResultsV1.vue'
import { useSessionsStore } from '../stores/sessions'
import type { Session } from '../types/session'

const store = useSessionsStore()
const filtered = ref<Session[]>([])
const selected = ref<number[]>([])

store.fetch()
</script>
