<template>
  <PersonalPrompt :welcome="welcome" :next-session="nextSession" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PersonalPrompt from './PersonalPrompt.vue'
import type { SessionSummary } from './PersonalPrompt.vue'
import {
  ACCESS_LABEL_ADMIN,
  ACCESS_LABEL_CHECK_IN,
  ACCESS_LABEL_SELF_SERVICE,
} from '../utils/accessLabels'

const props = defineProps<{
  isAdmin: boolean
  isCheckIn: boolean
  isSelfService: boolean
  nextSession: SessionSummary | null
}>()

const welcome = computed(() => {
  if (props.isAdmin) {
    return `Welcome to ${ACCESS_LABEL_ADMIN}`
  }
  if (props.isCheckIn) {
    return `Welcome to ${ACCESS_LABEL_CHECK_IN}`
  }
  return `Welcome to ${ACCESS_LABEL_SELF_SERVICE}`
})
</script>
