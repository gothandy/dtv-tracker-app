<template>
  <!-- A trail with no projects (FY "Show all trails"): the same card as a project. -->
  <div class="list-item-card list-item-card--subdued project-card">
    <div class="list-item-card__body">
      <p class="list-item-card__title">{{ name }}</p>
      <p class="list-item-card__subtext">{{ trail.replace(/:/g, ' › ') }}</p>
    </div>
    <div class="list-item-card__footer">
      <div class="list-item-card__stats">
        <span><strong>No projects</strong></span>
      </div>
      <AppButton v-if="canAdd" label="Add New" icon="add" mode="icon-only" @click="emit('add', trail)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'

const props = defineProps<{
  /** The trail's path, e.g. "XC:Adit" */
  trail: string
  /** May add projects (permission editProjects) */
  canAdd: boolean
}>()

const emit = defineEmits<{ add: [trail: string] }>()

const name = computed(() => props.trail.slice(props.trail.lastIndexOf(':') + 1))
</script>
