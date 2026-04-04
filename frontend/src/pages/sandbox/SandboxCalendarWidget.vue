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
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back { color: var(--color-dtv-green); text-decoration: none; font-size: 0.9rem; }
.back:hover { text-decoration: underline; }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.selected { font-size: 0.85rem; color: var(--color-text-muted); padding: 1rem; }
</style>
