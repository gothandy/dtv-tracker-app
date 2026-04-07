<template>
  <DefaultLayout>
    <h1 class="sr-only">Profiles</h1>
    <DebugData :item="{ profiles: profilesStore.profiles }" label="profiles" />
    <DebugData :item="profile.context" label="userProfile" />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import DebugData from '../components/DebugData.vue'
import { usePageTitle } from '../composables/usePageTitle'
import { useProfile } from '../composables/useProfile'
import { useProfilesStore } from '../stores/profiles'

usePageTitle('Profiles')

const profile = useProfile()
const profilesStore = useProfilesStore()

onMounted(() => profilesStore.fetch())
</script>
