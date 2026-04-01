<template>
  <DefaultLayout>
    <div class="pt-8 px-6">
      <GroupsFilterV1
        :groups="groupsStore.groups"
        :sessions="sessionsStore.sessions"
        @filtered="filtered = $event"
      />
      <GroupsResultsV1
        :groups="filtered"
        :loading="groupsStore.loading"
        :error="groupsStore.error"
      />
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import GroupsFilterV1 from '../components/GroupsFilterV1.vue'
import GroupsResultsV1 from '../components/GroupsResultsV1.vue'
import { useGroupsStore } from '../stores/groups'
import { useSessionsStore } from '../stores/sessions'
import type { GroupWithStats } from '../components/GroupsFilterV1.vue'

const groupsStore = useGroupsStore()
const sessionsStore = useSessionsStore()
const filtered = ref<GroupWithStats[]>([])

onMounted(() => {
  groupsStore.fetch()
  sessionsStore.fetch()
})
</script>
