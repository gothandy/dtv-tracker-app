<template>
  <DefaultLayout>
    <div class="pt-8">
      <SessionListFilter :sessions="store.sessions" @filtered="filtered = $event" />
      <SessionListActions :sessions="filtered" v-model:selected="selected" @tagged="store.fetch()" />
      <SessionListResults :sessions="filtered" :loading="store.loading" v-model:selected="selected" />
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import SessionListFilter from '../components/sessions/SessionListFilter.vue'
import SessionListActions from '../components/sessions/SessionListActions.vue'
import SessionListResults from '../components/sessions/SessionListResults.vue'
import { useSessionsStore } from '../stores/sessions'
import type { Session } from '../types/session'

const store = useSessionsStore()
const filtered = ref<Session[]>([])
const selected = ref<number[]>([])

store.fetch()
</script>
