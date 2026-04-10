<template>
  <div class="bg-dtv-gold px-6 py-4">
    <h2 class="font-display text-white text-xl uppercase leading-none mb-4">{{ session.isBookable ? "Who's Going?" : "Who Went?" }}</h2>
    <dl class="text-sm text-white space-y-1">
      <div class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Total</dt>
        <dd>{{ session.registrations }}<template v-if="isOperational && session.limits.total">/{{ session.limits.total }}</template></dd>
      </div>
      <div v-if="session.hours > 0" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Hours</dt>
        <dd>{{ session.hours }}</dd>
      </div>
      <div v-if="session.newCount || (isOperational && session.limits.new)" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">New</dt>
        <dd>{{ session.newCount ?? 0 }}<template v-if="isOperational && session.limits.new">/{{ session.limits.new }}</template></dd>
      </div>
      <div v-if="repeatCount || (isOperational && session.limits.repeat)" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Repeat</dt>
        <dd>{{ repeatCount }}<template v-if="isOperational && session.limits.repeat">/{{ session.limits.repeat }}</template></dd>
      </div>
      <div v-if="session.childCount || (isOperational && session.limits.child)" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Children</dt>
        <dd>{{ session.childCount ?? 0 }}<template v-if="isOperational && session.limits.child">/{{ session.limits.child }}</template></dd>
      </div>
      <div v-if="session.regularCount || (isOperational && session.regularsCount)" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Regulars</dt>
        <dd>{{ session.regularCount ?? 0 }}<template v-if="isOperational && session.regularsCount">/{{ session.regularsCount }}</template></dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import type { RoleContext } from '../../composables/useViewer'

const props = defineProps<{
  session: SessionDetailResponse
  profile?: RoleContext
}>()

const isOperational = computed(() => props.profile?.isOperational ?? false)
const repeatCount = computed(() =>
  Math.max(0, props.session.registrations - (props.session.newCount ?? 0) - (props.session.regularCount ?? 0))
)
</script>
