<template>
  <div class="pw-wrap">
    <component
      :is="w.url ? 'a' : 'div'"
      v-for="w in warnings"
      :key="w.text"
      :href="w.url"
      class="pw-item"
    >
      <img src="/icons/status/warning.svg" class="pw-icon svg-white" alt="" />
      {{ w.text }}
    </component>
  </div>
</template>

<script setup lang="ts">
defineProps<{ warnings: Array<{ text: string; url?: string }> }>()
</script>

<style scoped>
.pw-wrap {
  background: var(--color-dtv-dirt);
  padding: 0.6rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.pw-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-head);
  font-size: 0.9rem;
  color: var(--color-white);
}

.pw-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}

a.pw-item {
  text-decoration: none;
}
a.pw-item:hover {
  text-decoration: underline;
  text-decoration-color: var(--color-white);
}
</style>
