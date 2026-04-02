<template>
  <DefaultLayout>
    <div class="pt-8 px-6">
      <GroupListFilter
        :groups="groupsStore.groups"
        :sessions="sessionsStore.sessions"
        @filtered="filtered = $event"
      />
      <GroupListResults
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
import GroupListFilter from '../components/groups/GroupListFilter.vue'
import GroupListResults from '../components/groups/GroupListResults.vue'
import { useGroupsStore } from '../stores/groups'
import { useSessionsStore } from '../stores/sessions'
import type { GroupWithStats } from '../components/groups/GroupListFilter.vue'

const groupsStore = useGroupsStore()
const sessionsStore = useSessionsStore()
const filtered = ref<GroupWithStats[]>([])

onMounted(() => {
  groupsStore.fetch()
  sessionsStore.fetch()
})
</script>
