<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1 bg-white">
      <div class="max-w-5xl mx-auto">
        <FlashContainer :params="['flashName']" v-slot="{ flashKey, params, dismiss }">
          <FlashMessage :show="flashKey === 'signed-in'"    type="info"    @dismiss="dismiss">{{ params.flashName || profile.user?.displayName }} logged in</FlashMessage>
          <FlashMessage :show="flashKey === 'signed-out'"   type="neutral" @dismiss="dismiss">{{ params.flashName }} logged out</FlashMessage>
          <FlashMessage :show="flashKey === 'server-error'" type="error"   @dismiss="dismiss">Server could not be reached. Please try again.</FlashMessage>
        </FlashContainer>
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
import { useViewer } from '../composables/useViewer'

const profile = useViewer()
</script>
