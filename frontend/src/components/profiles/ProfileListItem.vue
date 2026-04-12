<template>
  <RouterLink :to="profilePath(profile.slug)" class="pli-wrap">
    <span class="pli-left">
      <span class="pli-name">{{ profile.name ?? '(no name)' }}</span>
      <span class="pli-badges">
        <img v-if="profile.isGroup" src="/icons/badges/group.svg" class="pli-badge svg-black" alt="Group" title="Group" />
        <img v-if="profile.isMember && !profile.isGroup" src="/icons/badges/member.svg" class="pli-badge svg-black" alt="Member" title="Member" />
        <img
          v-if="profile.cardStatus"
          src="/icons/badges/card.svg"
          class="pli-badge"
          :class="profile.cardStatus === 'Invited' ? 'svg-orange' : 'svg-green'"
          :alt="`Card: ${profile.cardStatus}`"
          :title="`Card: ${profile.cardStatus}`"
        />
      </span>
    </span>
    <span class="pli-meta">
      <span class="pli-stat pli-stat--full">{{ displaySessions }} <span class="pli-stat-label">sessions</span></span>
      <span class="pli-stat pli-stat--full">{{ displayHoursFormatted }} <span class="pli-stat-label">hours</span></span>
      <span class="pli-stat pli-stat--compact"><span class="pli-compact-sessions">{{ displaySessions }}</span> · {{ displayHoursFormatted }}h</span>
    </span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { profilePath } from '../../router/index'
import type { ProfileResponse } from '../../../../types/api-responses'

const props = defineProps<{
  profile: ProfileResponse
  displayHours: number
  displaySessions: number
}>()

const displayHoursFormatted = computed(() =>
  Math.round(props.displayHours * 10) / 10
)
</script>

<style scoped>
.pli-wrap {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  background: var(--color-dtv-light);
  text-decoration: none;
  color: var(--color-text);
}

.pli-wrap:hover { background: var(--color-dtv-sand-light); }

.pli-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  overflow: hidden;
}

.pli-name {
  font-weight: 400;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
}

.pli-badges {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  align-items: flex-start;
}

.pli-badge {
  width: 0.875rem;
  height: 0.875rem;
  object-fit: contain;
  align-self: flex-start;
}

.pli-meta {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.pli-stat { white-space: nowrap; }
.pli-stat-label { color: var(--color-text-muted); }
.pli-stat--full:first-child { color: var(--color-dtv-gold-dark); font-weight: 600; }
.pli-stat--full:first-child .pli-stat-label { color: var(--color-dtv-gold-dark); }

.svg-green { filter: invert(40%) sepia(80%) saturate(400%) hue-rotate(90deg) brightness(90%); }
.svg-orange { filter: invert(65%) sepia(80%) saturate(600%) hue-rotate(5deg) brightness(95%); }

.pli-stat--compact { display: none; }
.pli-compact-sessions { color: var(--color-dtv-gold-dark); font-weight: 600; }

@media (width < 48em) {
  .pli-stat--full { display: none; }
  .pli-stat--compact { display: inline; }
}
</style>
