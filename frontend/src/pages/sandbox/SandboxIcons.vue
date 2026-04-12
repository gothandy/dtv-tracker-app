<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>Icons</h1>

      <div v-for="group in groups" :key="group.label" class="si-section">
        <h2 class="si-section-title">{{ group.label }}</h2>
        <div class="si-grid">
          <div v-for="name in group.icons" :key="group.prefix + name" class="si-row">
            <div class="si-swatch si-swatch--dark">
              <img :src="`/icons/${group.prefix}${name}.svg`" :alt="name" class="si-icon svg-white" />
            </div>
            <div class="si-swatch si-swatch--light">
              <img :src="`/icons/${group.prefix}${name}.svg`" :alt="name" class="si-icon svg-black" />
            </div>
            <span class="si-name">{{ group.prefix }}{{ name }}</span>
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

const groups = [
  {
    label: 'Arrows',
    prefix: 'arrows/',
    icons: ['down', 'left', 'right', 'up'],
  },
  {
    label: 'Status',
    prefix: 'status/',
    icons: ['error', 'info', 'warning'],
  },
  {
    label: 'Badges',
    prefix: 'badges/',
    icons: ['card', 'child', 'csr', 'dig', 'diglead', 'firstaider', 'group', 'late', 'member', 'new', 'nophoto', 'regular'],
  },
  {
    label: 'Brands',
    prefix: 'brands/',
    icons: ['eventbrite', 'facebook', 'google', 'microsoft'],
  },
  {
    label: 'Icons',
    prefix: '',
    icons: [
      'add', 'burger', 'checkboxes', 'clock', 'close',
      'delete', 'download', 'edit',
      'filter', 'gear', 'locked', 'logout',
      'profile', 'refresh', 'register', 'regular', 'return',
      'save', 'settings', 'share', 'sort', 'tick', 'trash', 'upload', 'uploadphoto',
    ],
  },
]
</script>

<style scoped>
.si-section {
  margin-bottom: 1.5rem;
}

.si-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin: 0 0 0.5rem;
}

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
