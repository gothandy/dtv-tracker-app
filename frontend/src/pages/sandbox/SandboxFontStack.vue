<template>
  <DefaultLayout>
    <div class="sandbox" :class="{ fallback }">
      <SandboxBackLink />
      <h1>Font Stack</h1>

      <button class="toggle" @click="fallback = !fallback">
        {{ fallback ? 'Show web fonts' : 'Simulate fallback' }}
      </button>

      <div v-for="font in fonts" :key="font.var" class="font-group">
        <div class="meta">
          <span class="var-name">{{ font.var }}</span>
          <span class="stack">{{ font.stack }}</span>
        </div>
        <div class="samples" :style="{ fontFamily: `var(${font.var})` }">
          <div class="sample sample-xl">{{ font.sample }}</div>
          <div class="sample sample-lg">{{ font.sample }}</div>
          <div class="sample sample-md">{{ font.sample }}</div>
          <div class="sample sample-sm">{{ font.bodySample ?? font.sample }}</div>
        </div>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'

const fallback = ref(false)

const fonts = [
  {
    var: '--font-hero',
    stack: `'Rubik Dirt', Impact, Haettenschweiler, 'Arial Black', sans-serif`,
    sample: 'Donate Time Volunteer',
  },
  {
    var: '--font-head',
    stack: `'Momo Trust Display', 'Avenir Next', 'Segoe UI', Tahoma, Arial, sans-serif`,
    sample: 'Donate Time Volunteer',
  },
  {
    var: '--font-body',
    stack: `Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
    sample: 'Donate Time Volunteer',
    bodySample: 'The quick brown fox jumps over the lazy dog. Volunteering builds stronger communities across the country.',
  },
]
</script>

<style scoped>
.sandbox {
  gap: 1.5rem;
  background: #ffffff;
  color: #111;
}

/* When simulating fallback, override each var to drop the web font from the stack */
.sandbox.fallback {
  --font-hero: Impact, Haettenschweiler, 'Arial Black', sans-serif;
  --font-head: 'Avenir Next', 'Segoe UI', Tahoma, Arial, sans-serif;
  --font-body: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.toggle {
  align-self: flex-start;
  padding: 0.4rem 1rem;
  border: 1px solid #ccc;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 0.85rem;
}

.font-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-top: 1px solid #e0e0e0;
  padding-top: 1rem;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.var-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #333;
  font-family: monospace;
}

.stack {
  font-size: 0.75rem;
  color: #888;
  font-family: monospace;
}

.samples {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sample-xl { font-size: 3rem;   line-height: 1.1; }
.sample-lg { font-size: 2rem;   line-height: 1.2; }
.sample-md { font-size: 1.25rem; line-height: 1.3; }
.sample-sm { font-size: 0.9rem;  line-height: 1.5; }
</style>
