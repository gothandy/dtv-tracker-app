<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>LayoutColumns</h1>

      <h2>1-1-1</h2>
      <LayoutColumns ratio="1-1-1">
        <template #left><div class="col col--green">Left</div></template>
        <template #middle><div class="col col--gold">Middle</div></template>
        <template #right><div class="col col--dirt">Right</div></template>
      </LayoutColumns>

      <h2>1-1-1 (middle only)</h2>
      <LayoutColumns ratio="1-1-1">
        <template #middle><div class="col col--gold">Middle</div></template>
      </LayoutColumns>

      <h2>1-2</h2>
      <LayoutColumns ratio="1-2">
        <template #left><div class="col col--green">Left</div></template>
        <template #right><div class="col col--dirt">Right</div></template>
      </LayoutColumns>

      <h2>1-2 (left empty)</h2>
      <LayoutColumns ratio="1-2">
        <template #right><div class="col col--dirt">Right</div></template>
      </LayoutColumns>

      <h2>2-1</h2>
      <LayoutColumns ratio="2-1">
        <template #left><div class="col col--green">Left</div></template>
        <template #right><div class="col col--dirt">Right</div></template>
      </LayoutColumns>

      <h2>2-1 (right empty)</h2>
      <LayoutColumns ratio="2-1">
        <template #left><div class="col col--green">Left</div></template>
      </LayoutColumns>

      <h2>1 (left only)</h2>
      <LayoutColumns ratio="1">
        <template #left><div class="col col--green">Left</div></template>
      </LayoutColumns>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import LayoutColumns from '../../components/LayoutColumns.vue'

usePageTitle('Sandbox')
</script>

<style scoped>
.col {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  font-weight: 600;
  font-size: 0.95rem;
}

.col--green { background: var(--color-dtv-green); color: var(--color-white); }
.col--gold  { background: var(--color-dtv-gold);  color: var(--color-dtv-dark); }
.col--dirt  { background: var(--color-dtv-dirt);  color: var(--color-white); }
</style>
