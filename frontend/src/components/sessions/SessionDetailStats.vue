<template>
  <div class="bg-dtv-gold px-6 py-4">
    <h2 class="font-hero text-white text-xl uppercase leading-none mb-4">{{ session.isBookable ? "Who's Going?" : "Who Went?" }}</h2>
    <dl class="text-sm text-white space-y-1">
      <div class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Total</dt>
        <dd>{{ display.count }}<template v-if="display.totalLimit">/{{ display.totalLimit }}</template></dd>
      </div>
      <div v-if="display.hours > 0" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Hours</dt>
        <dd>{{ display.hours }}</dd>
      </div>
      <div v-if="display.new || display.newLimit" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">New</dt>
        <dd>{{ display.new }}<template v-if="display.newLimit">/{{ display.newLimit }}</template></dd>
      </div>
      <div v-if="display.repeatCount || display.repeatLimit" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Repeat</dt>
        <dd>{{ display.repeatCount }}<template v-if="display.repeatLimit">/{{ display.repeatLimit }}</template></dd>
      </div>
      <div v-if="display.child || display.childLimit" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Children</dt>
        <dd>{{ display.child }}<template v-if="display.childLimit">/{{ display.childLimit }}</template></dd>
      </div>
      <div v-if="display.regular || display.effectiveRegularsCount" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Regulars</dt>
        <dd>{{ display.regular }}<template v-if="display.effectiveRegularsCount">/{{ display.effectiveRegularsCount }}</template></dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import { sessionDisplayStats } from '../../utils/sessionStats'

const props = defineProps<{
  session: SessionDetailResponse
}>()

const display = computed(() => sessionDisplayStats(props.session.stats, props.session.regularsCount, props.session.limits))
</script>
