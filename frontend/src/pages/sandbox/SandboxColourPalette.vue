<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>Colour Palette</h1>

      <div v-for="row in palette" class="group">
        <div class="swatches">
          <div v-for="name in row.vars" class="swatch" :style="{ background: `var(${name})` }">
            <div class="label">{{ name }}</div>
          </div>
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
import SandboxBackLink from './SandboxBackLink.vue'



const palette = [
  { vars: ['--color-dtv-dark',   '--color-dtv-light', ''] },
  { vars: ['--color-dtv-green',  '--color-dtv-green-light',  '--color-dtv-green-dark']  },
  { vars: ['--color-dtv-dirt',   '--color-dtv-dirt-light',   '--color-dtv-dirt-dark']   },
  { vars: ['--color-dtv-gold',   '--color-dtv-gold-light',   '--color-dtv-gold-dark']   },
  { vars: ['--color-dtv-sand',   '--color-dtv-sand-light',   '--color-dtv-sand-dark']   }
]
</script>

<style scoped>
.sandbox {
  gap: 0.75rem;
  background: #ffffff;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.swatches {
  display: flex;
}

.swatch {
  flex: 1;
  height: 120px;
}

.label {
  color: #444;
  background: #fff;
}
</style>
