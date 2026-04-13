<template>
  <PersonalPrompt
    v-if="message"
    :message="message"
    :next-session="nextSession"
    :previous-session="previousSession"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PersonalPrompt from './PersonalPrompt.vue'
import type { SessionSummary } from './PersonalPrompt.vue'

const props = defineProps<{
  isAdmin: boolean
  isCheckIn: boolean
  isReadOnly: boolean
  isSelfService: boolean
  isNew: boolean
  isRepeat: boolean
  isRegular: boolean
  hasBooking: boolean
  hasAttended: boolean
  nextSession: SessionSummary | null
  previousSession: SessionSummary | null
}>()

const message = computed<string | null>(() => {
  if (props.isAdmin || props.isReadOnly) {
    return "You're a DTV Tracker admin"
  }

  if (props.isCheckIn) {
    return 'Ready to manage your sessions and volunteers'
  }

  if (!props.isSelfService) return null

  const next = props.nextSession?.groupName
  const prev = props.previousSession?.groupName

  if (props.isNew && props.hasBooking && next) {
    return `Your first ${next} is booked, read all about it`
  }

  if (props.isRepeat && props.hasBooking && next) {
    return `Your next ${next} is booked, check the details`
  }

  if (props.isNew && !props.hasBooking && props.hasAttended && prev) {
    return `You completed your first ${prev}, see photos and get booked on the next`
  }

  if (props.isRegular && props.hasBooking && next) {
    return `You're booked onto ${next}, check the latest details`
  }

  if (props.isRegular && !props.hasBooking && prev) {
    return `Catch up on ${prev} and check what's coming up next`
  }

  return null
})
</script>
