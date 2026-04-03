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
import DefaultLayout from '../../layouts/DefaultLayout.vue'

const components = [
  { name: 'AppButton', path: '/sandbox/app-button' },
  { name: 'Action Bars', path: '/sandbox/action-bars' },
  { name: 'Modals', path: '/sandbox/modals' },
  { name: 'Modal Layout', path: '/sandbox/modal-layout' },
  { name: 'Colour Palette', path: '/sandbox/colour-palette' },
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
