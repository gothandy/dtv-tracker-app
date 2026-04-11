<template>
  <div class="form-card">
    <div v-if="title || subtitle" class="form-card-header">
      <h2 v-if="title" class="form-card-title">{{ title }}</h2>
      <p v-if="subtitle" class="form-card-subtitle">{{ subtitle }}</p>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<style scoped>
.form-card {
  background: var(--color-dtv-sand-light);
  padding: 1.5rem;
}

.form-card-header {
  text-align: center;
  margin-bottom: 1.25rem;
}

.form-card-title {
  font-family: var(--font-head);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-dtv-dark);
  margin: 0 0 0.25rem;
}

.form-card-subtitle {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.65;
  margin: 0;
  line-height: 1.4;
}
</style>
