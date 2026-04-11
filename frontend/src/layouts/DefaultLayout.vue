<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1 bg-white">
      <div class="max-w-5xl mx-auto">
        <FlashMessageContainer>
          <FlashMessage notice="signed-in"    :active="active" type="info">Welcome back, {{ name || profile.user?.displayName }}.</FlashMessage>
          <FlashMessage notice="signed-out"   :active="active" type="neutral">Goodbye, {{ name }}.</FlashMessage>
          <FlashMessage notice="server-error" :active="active" type="error">Server could not be reached. Please try again.</FlashMessage>
        </FlashMessageContainer>
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
import { useViewer } from '../composables/useViewer'
import { useFlash } from '../composables/useFlash'

const profile = useViewer()
const { active, name } = useFlash()
</script>
