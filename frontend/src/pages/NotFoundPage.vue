<template>
  <TaskLayout>
    <FormCard title="Page not found">
      <p class="nf-message">This page doesn't exist.</p>
      <FormSubmitRow>
        <AppButton usage="task" label="Go to home page" @click="router.push('/')" />
        <AppButton v-if="viewer.isPublic" usage="task" variant="subtle" label="Sign in" @click="router.push('/login')" />
      </FormSubmitRow>
    </FormCard>
  </TaskLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import TaskLayout from '../layouts/TaskLayout.vue'
import FormCard from '../components/forms/FormCard.vue'
import AppButton from '../components/AppButton.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import { useViewer } from '../composables/useViewer'
import { usePageTitle } from '../composables/usePageTitle'

usePageTitle('Page not found')

const router = useRouter()
const viewer = useViewer()
</script>

<style scoped>
.nf-message {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  text-align: center;
  margin: 0 0 0.5rem;
}
</style>
