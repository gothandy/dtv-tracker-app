<template>
  <DefaultLayout>
    <div class="sandbox">
      <h1>Sandbox</h1>
      <ul>
        <li v-for="c in components" :key="c.path">
          <RouterLink :to="c.path">{{ c.name }}</RouterLink>
        </li>
      </ul>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import DefaultLayout from '../../layouts/DefaultLayout.vue'

const components = [
  { name: 'Brand Palette', path: '/sandbox/colour-palette' },
  { name: 'AppButton', path: '/sandbox/app-button' },
  { name: 'All Actions', path: '/sandbox/action-bars' },
  { name: 'Form Components', path: '/sandbox/form-components' },
  { name: 'Modal Layout', path: '/sandbox/modal-layout' },
  { name: 'All Modals', path: '/sandbox/modals' },
  { name: 'LayoutColumns', path: '/sandbox/layout-columns' },
  { name: 'ConcertinaLayout', path: '/sandbox/concertina-layout' },
  { name: 'CalendarWidget', path: '/sandbox/calendar-widget' },
  { name: 'FyBarChart', path: '/sandbox/fy-bar-chart' },
  { name: 'TagCloud', path: '/sandbox/tag-cloud' },
  { name: 'MediaCard', path: '/sandbox/media-card' },
  { name: 'MediaCarousel', path: '/sandbox/media-carousel' },
  { name: 'SessionCard', path: '/sandbox/session-card' },
  { name: 'GroupCard', path: '/sandbox/group-card' },
  { name: 'Filter Components', path: '/sandbox/filter-components' },
  { name: 'EntryCard', path: '/sandbox/entry-card' },
]
  
</script>

<style scoped>
.sandbox {
  padding: 2rem;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

a {
  color: var(--color-dtv-green);
  text-decoration: none;
  font-weight: 600;
}

a:hover {
  text-decoration: underline;
}
</style>
