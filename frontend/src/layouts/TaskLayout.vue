<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1 bg-white">
      <FlashMessageContainer>
        <FlashMessage notice="signed-in" :active="active" type="info">Welcome back.</FlashMessage>
      </FlashMessageContainer>
      <div class="task-layout-body">
        <slot />
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import AppFooter from '../components/AppFooter.vue'
import FlashMessageContainer from '../components/FlashMessageContainer.vue'
import FlashMessage from '../components/FlashMessage.vue'
import { useFlash } from '../composables/useFlash'

const { active } = useFlash()
</script>

<style scoped>
.task-layout-body {
  max-width: 26rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

@media (width < 48em) {
  .task-layout-body {
    padding: 1rem;
  }
}
</style>
