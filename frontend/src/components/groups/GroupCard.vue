<template>
  <div class="list-item-card group-card">

    <div class="list-item-card__body">
      <div v-if="group.eventbriteSeriesId" class="list-item-card__title-row">
        <p class="list-item-card__title">{{ group.displayName || group.key }}</p>
        <img
          src="/icons/brands/eventbrite.svg"
          class="list-item-card__title-badge"
          alt="Eventbrite"
          title="Linked to Eventbrite"
        />
      </div>
      <p v-else class="list-item-card__title">{{ group.displayName || group.key }}</p>
      <p v-if="group.description" class="list-item-card__description prose">{{ group.description }}</p>
    </div>

    <div class="list-item-card__footer">
      <div class="list-item-card__stats">
        <span v-if="group.regularsCount > 0"><strong>{{ group.regularsCount }}</strong> regulars</span>
        <span><strong>{{ group.sessionCount }}</strong> sessions</span>
        <span><strong>{{ Math.round(group.hours) }}</strong> hrs</span>
      </div>
      <RouterLink :to="viewPath"><AppButton label="View" /></RouterLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { groupPath } from '../../router/index'
import type { GroupWithStats } from './GroupListFilter.vue'
import AppButton from '../AppButton.vue'

const props = defineProps<{ group: GroupWithStats }>()

const viewPath = computed(() => groupPath(props.group.key))
</script>
