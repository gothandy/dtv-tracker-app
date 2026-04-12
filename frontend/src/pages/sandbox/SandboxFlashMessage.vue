<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>FlashMessage</h1>

      <h2>Variants</h2>
      <div class="fm-previews">
        <div class="fm-preview">
          <p class="fm-label">info</p>
          <FlashMessage :show="true" type="info" @dismiss="() => {}">Welcome back, Andrew.</FlashMessage>
        </div>
        <div class="fm-preview">
          <p class="fm-label">neutral</p>
          <FlashMessage :show="true" type="neutral" @dismiss="() => {}">Goodbye, andrew@dtv.org.uk.</FlashMessage>
        </div>
        <div class="fm-preview">
          <p class="fm-label">error</p>
          <FlashMessage :show="true" type="error" @dismiss="() => {}">Server could not be reached. Please try again.</FlashMessage>
        </div>
      </div>

      <h2>Live trigger</h2>
      <div class="fm-buttons">
        <button class="fm-btn" @click="router.push({ query: { flashKey: 'signed-in' } })">signed-in</button>
        <button class="fm-btn" @click="router.push({ query: { flashKey: 'signed-out', flashName: 'Andrew' } })">signed-out</button>
        <button class="fm-btn" @click="router.push({ query: { flashKey: 'server-error' } })">server-error</button>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
import { useRouter } from 'vue-router'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import FlashMessage from '../../components/FlashMessage.vue'

usePageTitle('Sandbox')

const router = useRouter()
</script>

<style scoped>
.fm-previews {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.fm-preview {
  position: relative;
  min-height: 2.5rem;
}

.fm-label {
  font-size: 0.8rem;
  font-family: monospace;
  opacity: 0.6;
  margin: 0 0 0.25rem;
}

.fm-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.fm-btn {
  padding: 0.4rem 0.85rem;
  background: var(--color-dtv-sand);
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
}
.fm-btn:hover { background: var(--color-dtv-sand-dark); }
</style>
