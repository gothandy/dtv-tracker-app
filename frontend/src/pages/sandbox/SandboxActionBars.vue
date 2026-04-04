<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Action Bars</h1>

      <h2>SessionDetailActions</h2>
      <div class="sab-wrap">
        <AppButton icon="upload" label="Upload Photos" mode="icon-responsive" />
        <AppButton icon="edit" label="Edit Session" mode="icon-responsive" />
      </div>

      <h2>SessionListActions</h2>
      <div class="sa-wrap">
        <span class="sa-stats">3 sessions selected — 12h</span>
        <div class="sa-buttons">
          <AppButton label="Add Tags" icon="add" mode="icon-responsive" />
          <AppButton label="Download CSV" icon="download" mode="icon-responsive" />
        </div>
      </div>
      <div class="sa-wrap">
        <span class="sa-stats">No sessions selected.</span>
        <div class="sa-buttons">
          <AppButton label="Add Tags" icon="add" mode="icon-responsive" disabled />
          <AppButton label="Download CSV" icon="download" mode="icon-responsive" disabled />
        </div>
      </div>

      <h2>GroupDetailActions</h2>
      <div class="gab-wrap">
        <AppButton label="Add session" icon="add" mode="icon-responsive" />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" />
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import AppButton from '../../components/AppButton.vue'
</script>

<style scoped>
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back {
  color: var(--color-dtv-green);
  text-decoration: none;
  font-size: 0.9rem;
}
.back:hover { text-decoration: underline; }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  border-bottom: 2px solid #ccc;
  padding-bottom: 0.5rem;
}

h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 0;
}

/* SessionDetailActions */
.sab-wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface-hover);
}

/* SessionListActions */
.sa-wrap {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: var(--color-surface-hover);
  padding: 0.75rem 1.5rem;
}
.sa-stats { font-size: 0.85rem; color: var(--color-text-secondary); margin-right: auto; }
.sa-buttons { display: flex; gap: 0.5rem; }

/* GroupDetailActions */
.gab-wrap {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface-hover);
}
</style>
