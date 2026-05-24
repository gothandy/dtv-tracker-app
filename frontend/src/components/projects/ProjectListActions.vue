<template>
  <div v-if="profile.isAdmin" class="list-actions">
    <span class="list-actions-stats">
      {{ projects.length }} projects &nbsp;&nbsp; {{ totalHours }} hours
    </span>
    <div class="list-actions-buttons">
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
      <AppButton label="New project" icon="add" mode="icon-only" @click="emit('add-project')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'
import { shareCurrentUrl } from '../../utils/shareUrl'
import type { ProjectWithStats } from './ProjectListFilter.vue'
import type { RoleContext } from '../../composables/useViewer'

const props = defineProps<{
  projects: ProjectWithStats[]
  profile: RoleContext
}>()

const emit = defineEmits<{ 'add-project': [] }>()

const totalHours = computed(() =>
  Math.round(props.projects.reduce((sum, p) => sum + p.hours, 0) * 10) / 10)

function onShare() {
  shareCurrentUrl()
}
</script>
