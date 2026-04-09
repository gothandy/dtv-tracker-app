<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Colour Palette</h1>

      <div v-for="c in colours" :key="c.name" class="colour-row">
        <div class="swatch swatch--base" :style="{ background: c.hex }" />
        <div class="colour-label">
          <span class="colour-name">{{ c.name }}</span>
          <span class="colour-hex">{{ c.hex }}</span>
        </div>
        <div v-if="!c.hideVariants" class="variants">
          <div class="swatch swatch--dark"  :style="{ background: c.hex }" />
          <div class="swatch swatch--light" :style="{ background: c.hex }" />
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import DefaultLayout from '../../layouts/DefaultLayout.vue'

const colours = [
  { name: '--color-dtv-dark',  hex: '#000204', hideVariants: true },
  { name: '--color-dtv-green', hex: '#4FAF4A' },
  { name: '--color-dtv-dirt',  hex: '#B04A4F' },
  { name: '--color-dtv-gold',  hex: '#B0AB4A' },
  { name: '--color-dtv-sand',  hex: '#E1E0D1' },
  { name: '--color-dtv-light', hex: '#fffffc', hideVariants: true },
]
</script>

<style scoped>
.sandbox {
  gap: 0.75rem;
  background: #ffffff;
}

.colour-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.swatch {
  border: 1px solid #ccc;
  flex-shrink: 0;
}

.swatch--base  { width: 80px; height: 80px; }
.swatch--dark  { width: 40px; height: 40px; filter: brightness(var(--brightness-dark)); }
.swatch--light { width: 40px; height: 40px; filter: brightness(var(--brightness-light)); }

.colour-label {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  font-family: monospace;
  font-size: 0.8rem;
}

.colour-name { color: #333; }
.colour-hex  { color: #666; }

.variants {
  display: flex;
  gap: 0;
}
</style>
