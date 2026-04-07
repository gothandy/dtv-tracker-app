<template>
  <DefaultLayout>
    <h1 class="sr-only">Profile</h1>
    <DebugData :item="pageProfile ?? {}" label="pageProfile" />
    <DebugData :item="profile.context" label="userProfile" />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import DebugData from '../components/DebugData.vue'
import { useProfile } from '../composables/useProfile'
import type { ProfileDetailResponse } from '../../../types/api-responses'

const route = useRoute()
const profile = useProfile()

const pageProfile = ref<ProfileDetailResponse | null>(null)

watchEffect(async () => {
  const slug = route.params.slug as string
  pageProfile.value = null
  try {
    const res = await window.fetch(`/api/profiles/${slug}`)
    if (!res.ok) throw new Error(`Failed to load profile (${res.status})`)
    const json: { data: ProfileDetailResponse } = await res.json()
    pageProfile.value = json.data
  } catch (e) {
    console.error('[ProfileDetailPage]', e)
  }
})
</script>
