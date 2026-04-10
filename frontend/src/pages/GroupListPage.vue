<template>
  <DefaultLayout>
    <h1 class="sr-only">Groups</h1>
    <PageHeader>Groups</PageHeader>
    <div class="px-6 pb-6">
      <GroupListFilter
        :groups="groupsStore.groups"
        :sessions="sessionsStore.sessions"
        :can-add-group="profile.isAdmin"
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
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'

usePageTitle('Groups')
import GroupListFilter from '../components/groups/GroupListFilter.vue'
import GroupListResults from '../components/groups/GroupListResults.vue'
import { useGroupListStore } from '../stores/groupList'
import { useSessionListStore } from '../stores/sessionList'
import { useViewer } from '../composables/useViewer'
import type { GroupWithStats } from '../components/groups/GroupListFilter.vue'

const groupsStore = useGroupListStore()
const sessionsStore = useSessionListStore()
const profile = useViewer()
const filtered = ref<GroupWithStats[]>([])

onMounted(() => {
  groupsStore.fetch()
  sessionsStore.fetch()
})
</script>
