<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Error Pages</h1>

      <!-- NotFoundPage — public (sign-in button shown) -->
      <h2>NotFoundPage — public user</h2>
      <div class="task-body">
        <FormCard title="Page not found">
          <p class="ep-message">This page doesn't exist.</p>
          <FormSubmitRow>
            <AppButton usage="task" label="Go to home page" />
            <AppButton usage="task" variant="subtle" label="Sign in" />
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- NotFoundPage — authenticated (no sign-in button) -->
      <h2>NotFoundPage — authenticated user</h2>
      <div class="task-body">
        <FormCard title="Page not found">
          <p class="ep-message">This page doesn't exist.</p>
          <FormSubmitRow>
            <AppButton usage="task" label="Go to home page" />
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- ForbiddenPage -->
      <h2>ForbiddenPage</h2>
      <div class="task-body">
        <FormCard title="Access denied">
          <p class="ep-message">
            You don't have permission to view this page.
            <a href="mailto:admin@deantrailvolunteers.org.uk" class="ep-link">Contact us</a>
            if you think this is a mistake.
          </p>
          <FormSubmitRow>
            <AppButton usage="task" label="Go to home page" />
          </FormSubmitRow>
        </FormCard>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import FormCard from '../../components/forms/FormCard.vue'
import AppButton from '../../components/AppButton.vue'
import FormSubmitRow from '../../components/forms/FormSubmitRow.vue'

usePageTitle('Error Pages — Sandbox')
</script>

<style scoped>
.task-body {
  max-width: 26rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.ep-message {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  text-align: center;
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.ep-link {
  color: var(--color-dtv-green-dark);
  opacity: 1;
}
</style>
