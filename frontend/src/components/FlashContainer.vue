<template>
  <div class="flash-container">
    <slot :flashKey="flashKey" :params="params" :dismiss="dismiss" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{
  params?: string[]
}>()

const route  = useRoute()
const router = useRouter()

const flashKey = ref<string | null>(null)
const params   = ref<Record<string, string>>({})

function show(key: string, extracted: Record<string, string>) {
  flashKey.value = key
  params.value   = extracted
}

function dismiss() {
  flashKey.value = null
  params.value   = {}
}

// Pick up ?notice= query param, clean URL, activate message
watch(() => route.query.flashKey as string, (key) => {
  if (!key) return

  const extracted: Record<string, string> = {}
  for (const p of props.params ?? []) {
    if (typeof route.query[p] === 'string') extracted[p] = route.query[p] as string
  }

  const cleaned: Record<string, string | string[] | null | undefined> = { ...route.query, flashKey: undefined }
  for (const p of props.params ?? []) cleaned[p] = undefined
  router.replace({ query: cleaned })

  show(key, extracted)
}, { immediate: true })

// Dismiss on navigation — message lifetime = current page
watch(() => route.path, () => dismiss())
</script>

<style scoped>
.flash-container {
  position: relative;
  height: 0;
}
</style>
