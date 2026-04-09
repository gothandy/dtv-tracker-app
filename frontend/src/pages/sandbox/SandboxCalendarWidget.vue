<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>CalendarWidget</h1>

      <LayoutColumns ratio="1-1-1">
        <template #middle>
          <CalendarWidget
            v-model="selectedDate"
            :sessions="store.sessions"
          />
        </template>
        <template #right>
          <p v-if="selectedDate" class="selected">Selected: {{ selectedDate }}</p>
        </template>
      </LayoutColumns>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import CalendarWidget from '../../components/CalendarWidget.vue'
import LayoutColumns from '../../components/LayoutColumns.vue'
import { useSessionsStore } from '../../stores/sessions'

usePageTitle('Sandbox')

const store = useSessionsStore()
store.fetch()

const selectedDate = ref('')
</script>

<style scoped>
.selected { font-size: 0.85rem; color: var(--color-text-muted); padding: 1rem; }
</style>
