<template>
  <DefaultLayout>
    <h1 class="sr-only">Sessions</h1>
    <PageHeader>Sessions</PageHeader>
    <div class="px-6 pb-6">
      <SessionListFilter :sessions="store.sessions" @filtered="filtered = $event" />
      <SessionListActions :sessions="filtered" v-model:selected="selected" @tagged="store.fetch()" />
      <SessionListResults :sessions="filtered" :loading="store.loading" v-model:selected="selected" />
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'

usePageTitle('Sessions')
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
