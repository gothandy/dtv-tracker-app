<template>
  <div class="flash-container">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFlash } from '../composables/useFlash'

const route  = useRoute()
const router = useRouter()
const { show, dismiss } = useFlash()

const COMPANION_PARAMS = ['name', 'email']

watch(() => route.query.notice as string, (key) => {
  if (!key) return

  const params: Record<string, string> = {}
  for (const p of COMPANION_PARAMS) {
    if (typeof route.query[p] === 'string') params[p] = route.query[p] as string
  }

  const cleaned: Record<string, string | string[] | null | undefined> = { ...route.query, notice: undefined }
  for (const p of COMPANION_PARAMS) cleaned[p] = undefined
  router.replace({ query: cleaned })

  show(key, params)
}, { immediate: true })

// expose dismiss so FlashMessage can call it without importing useFlash
defineExpose({ dismiss })
</script>

<style scoped>
.flash-container {
  position: relative;
  height: 0;
}
</style>
