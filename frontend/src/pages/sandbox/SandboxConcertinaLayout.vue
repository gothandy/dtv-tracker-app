<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>ConcertinaLayout</h1>

      <h2>1-2 (left) — icon-text, initial open</h2>
      <LayoutColumns ratio="1-2">
        <template #left>
          <ConcertinaLayout>
            <ConcertinaItem label="Button 1" icon="group"><div class="card">Card 1</div></ConcertinaItem>
            <ConcertinaItem label="Button 2" icon="group"><div class="card">Card 2</div></ConcertinaItem>
            <ConcertinaItem label="Button 3" icon="group"><div class="card">Card 3</div></ConcertinaItem>
          </ConcertinaLayout>
        </template>
        <template #right><div class="placeholder">Right</div></template>
      </LayoutColumns>

      <h2>2-1 (left) — text-only, onSelectedClick on Button 1</h2>
      <LayoutColumns ratio="2-1">
        <template #left>
          <ConcertinaLayout>
            <ConcertinaItem label="Button 1" :on-selected-click="() => onSelectedClick()"><div class="card">Card 1</div></ConcertinaItem>
            <ConcertinaItem label="Button 2"><div class="card">Card 2</div></ConcertinaItem>
            <ConcertinaItem label="Button 3"><div class="card">Card 3</div></ConcertinaItem>
          </ConcertinaLayout>
        </template>
        <template #right><div class="placeholder">Right</div></template>
      </LayoutColumns>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import LayoutColumns from '../../components/LayoutColumns.vue'
import ConcertinaLayout from '../../components/ConcertinaLayout.vue'
import ConcertinaItem from '../../components/ConcertinaItem.vue'
import { usePageTitle } from '../../composables/usePageTitle'

usePageTitle('Sandbox')

function onSelectedClick() {
  window.alert('Button 1 selected click')
}
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

h2 { font-size: 1rem; font-weight: 600; color: var(--color-text-muted); }

.card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-dtv-light);
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 1rem;
  min-height: 200px;
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  background: var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
}
</style>
