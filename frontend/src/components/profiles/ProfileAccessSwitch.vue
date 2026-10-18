<template>
  <div class="pas-row">
    <span>Working as <strong>{{ isAdmin ? ACCESS_LABEL_ADMIN : ACCESS_LABEL_CHECK_IN }}</strong></span>
    <AppButton
      :label="isAdmin ? `Switch to ${ACCESS_LABEL_CHECK_IN}` : `Switch to ${ACCESS_LABEL_ADMIN}`"
      variant="subtle"
      :working="working"
      @click="emit('switch', isAdmin ? 'checkin' : 'admin')"
    />
    <p v-if="error" class="pas-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../AppButton.vue'
import { ACCESS_LABEL_ADMIN, ACCESS_LABEL_CHECK_IN } from '../../utils/accessLabels'

/** For someone on the admin list, on their own profile: switch Admin on or off (remembered on this device). */
defineProps<{
  isAdmin: boolean
  working?: boolean
  error?: string
}>()

const emit = defineEmits<{ switch: [role: 'admin' | 'checkin'] }>()
</script>

<style scoped>
.pas-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.pas-error {
  flex-basis: 100%;
  margin: 0;
  color: var(--color-dtv-red);
}
</style>
