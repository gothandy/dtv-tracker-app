<template>
  <div class="pgl-wrap">
    <div class="pgl-header">
      <h2 class="pgl-title">Groups</h2>
    </div>

    <p v-if="!groups.length" class="pgl-empty">No groups yet.</p>

    <div v-else class="pgl-grid">
      <ProfileGroupItem
        v-for="g in groups"
        :key="g.groupId"
        :group-id="g.groupId"
        :group-key="g.groupKey"
        :group-name="g.groupName"
        :hours="hoursFor(g)"
        :is-regular="g.isRegular"
        :regular-id="g.regularId"
        :allow-toggle-regular="allowToggleRegular"
        :working="workingGroupId === g.groupId"
        @add-regular="onAddRegular(g.groupId)"
        @remove-regular="onRemoveRegular(g.regularId!, g.groupId)"
      />
    </div>

    <div v-if="error" class="pgl-error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ProfileGroupItem from './ProfileGroupItem.vue'
import type { ProfileGroupHours } from '../../../../types/api-responses'

const props = withDefaults(defineProps<{
  groups: ProfileGroupHours[]
  allowToggleRegular?: boolean
  fy?: 'all' | 'thisFY' | 'lastFY'
}>(), {
  fy: 'all',
})

const emit = defineEmits<{
  addRegular: [groupId: number]
  removeRegular: [regularId: number, groupId: number]
}>()

const workingGroupId = ref<number | null>(null)
const error = ref('')

function onAddRegular(groupId: number) {
  workingGroupId.value = groupId
  emit('addRegular', groupId)
}

function onRemoveRegular(regularId: number, groupId: number) {
  workingGroupId.value = groupId
  emit('removeRegular', regularId, groupId)
}

function hoursFor(g: ProfileGroupHours): number {
  if (props.fy === 'thisFY') return g.hoursThisFY
  if (props.fy === 'lastFY') return g.hoursLastFY
  return g.hoursAll
}

defineExpose({
  onSuccess(groupId: number) {
    if (workingGroupId.value === groupId) workingGroupId.value = null
    error.value = ''
  },
  onError(groupId: number, msg = 'Failed to update — please try again') {
    if (workingGroupId.value === groupId) workingGroupId.value = null
    error.value = msg
  },
})
</script>

<style scoped>
.pgl-wrap {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
}

.pgl-header {
  margin-bottom: 0.75rem;
}

.pgl-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.pgl-empty {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
}

.pgl-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pgl-error {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: var(--color-dtv-dirt-light);
  color: var(--color-dtv-dirt);
  font-size: 0.85rem;
}
</style>
