<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1 bg-white">
      <FlashContainer v-slot="{ flashKey, dismiss }">
        <!-- TODO: decide whether to keep, restyle, or remove the signed-in flash -->
        <!-- <FlashMessage :show="flashKey === 'signed-in'" type="info" @dismiss="dismiss">Welcome back.</FlashMessage> -->
      </FlashContainer>
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
import FlashContainer from '../components/FlashContainer.vue'
import FlashMessage from '../components/FlashMessage.vue'
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
