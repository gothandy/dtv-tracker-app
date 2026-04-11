<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Icons</h1>

      <div class="si-grid">
        <div v-for="name in icons" :key="name" class="si-row">
          <div class="si-swatch si-swatch--dark">
            <img :src="`/icons/${name}.svg`" :alt="name" class="si-icon svg-white" />
          </div>
          <div class="si-swatch si-swatch--light">
            <img :src="`/icons/${name}.svg`" :alt="name" class="si-icon svg-black" />
          </div>
          <span class="si-name">{{ name }}</span>
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

const icons = [
  'add', 'burger', 'card', 'checkboxes', 'child', 'clock', 'close', 'csr',
  'delete', 'dig', 'diglead', 'download', 'edit', 'eventbrite',
  'facebook', 'filter', 'firstaider', 'gear', 'google', 'group', 'late',
  'locked', 'logout', 'member', 'microsoft', 'new', 'next', 'nophoto',
  'prev', 'profile', 'refresh', 'register', 'regular', 'return',
  'save', 'settings', 'share', 'sort', 'tick', 'trash', 'upload', 'uploadphoto', 'warning',
]
</script>

<style scoped>
.si-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.si-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.si-swatch {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.si-swatch--dark  { background: var(--color-dtv-dark); }
.si-swatch--light { background: var(--color-dtv-sand); }

.si-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.si-name {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
