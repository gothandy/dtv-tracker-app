<template>
  <div class="tf-wrap">
    <div class="tf-title-row">
      <div class="tf-actions">
        <FyFilter v-model="context" :options="OPTIONS" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import type { TemplateResponse } from '../../../../types/api-responses'

const OPTIONS = [
  { value: 'all', label: 'Show all' },
  { value: 'Session', label: 'Sessions' },
  { value: 'Profile', label: 'Profiles' },
]

const props = defineProps<{ templates: TemplateResponse[] }>()
const emit = defineEmits<{ filtered: [templates: TemplateResponse[]] }>()

const route = useRoute()
const router = useRouter()

const fromQuery = route.query.context as string
const context = ref(OPTIONS.some(o => o.value === fromQuery) ? fromQuery : 'all')

const filtered = computed(() =>
  context.value === 'all' ? props.templates : props.templates.filter(t => t.context === context.value)
)

watch(filtered, list => emit('filtered', list), { immediate: true })

watch(context, value => {
  router.replace({ query: value === 'all' ? {} : { context: value } })
})
</script>

<style scoped>
.tf-wrap {
  background: var(--color-dtv-sand);
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.tf-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tf-actions {
  margin-left: auto;
}
</style>
