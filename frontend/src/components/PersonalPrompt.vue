<template>
  <div class="personal-prompt">
    <p class="personal-prompt__message">{{ message }}</p>
    <div class="personal-prompt__actions">
      <AppButton
        v-if="nextSession"
        label="View Next Session"
        :href="nextSessionPath"
      />
      <AppButton
        v-if="previousSession"
        label="View Last Session"
        :href="previousSessionPath"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from './AppButton.vue'
import { sessionPath } from '../router'

export interface SessionSummary {
  groupKey: string
  groupName?: string
  date: string
}

const props = defineProps<{
  message: string
  nextSession: SessionSummary | null
  previousSession: SessionSummary | null
}>()

const nextSessionPath     = computed(() => props.nextSession     ? sessionPath(props.nextSession.groupKey,     props.nextSession.date)     : '')
const previousSessionPath = computed(() => props.previousSession ? sessionPath(props.previousSession.groupKey, props.previousSession.date) : '')
</script>

<style scoped>
.personal-prompt {
  background: var(--color-dtv-dark);
  color: var(--color-dtv-light);
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.personal-prompt__message {
  font-size: 0.95rem;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
}

.personal-prompt__actions {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  flex-shrink: 0;
}

@media (width < 48em) {
  .personal-prompt {
    flex-direction: column;
    align-items: flex-start;
  }

  .personal-prompt__actions {
    width: 100%;
    flex-direction: column;
  }
}
</style>
