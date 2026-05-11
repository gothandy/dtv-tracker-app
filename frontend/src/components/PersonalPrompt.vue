<template>
  <div class="personal-prompt">
    <p class="personal-prompt__welcome">{{ welcome }}</p>
    <div class="personal-prompt__actions">
      <AppButton
        usage="task"
        label="Your Next Session"
        :href="nextSessionHref"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from './AppButton.vue'
import { sessionPath, sessionsPath } from '../router'

export interface SessionSummary {
  groupKey: string
  groupName?: string
  date: string
}

const props = defineProps<{
  welcome: string
  nextSession: SessionSummary | null
}>()

/** Concrete next session, or sessions list when none scheduled. */
const nextSessionHref = computed(() =>
  props.nextSession
    ? sessionPath(props.nextSession.groupKey, props.nextSession.date)
    : sessionsPath(),
)
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

.personal-prompt__welcome {
  font-size: 0.95rem;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  margin: 0;
}

.personal-prompt__actions {
  display: flex;
  flex-shrink: 0;
}

@media (width < 48em) {
  .personal-prompt {
    flex-direction: column;
    align-items: flex-start;
  }

  .personal-prompt__actions {
    width: 100%;
  }

  .personal-prompt__actions :deep(.app-btn) {
    width: 100%;
    justify-content: center;
  }
}
</style>
