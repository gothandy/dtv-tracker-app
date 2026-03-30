<template>
  <div>
    <button @click="open = !open" class="text-xs text-gray-400 hover:text-gray-600 uppercase tracking-widest cursor-pointer">
      {{ open ? '▲ Debug' : '▼ Debug' }}
    </button>
    <dl v-if="open" class="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-dtv-dark">
      <template v-for="(value, key) in item" :key="key">
        <dt class="text-gray-400 self-start">{{ key }}</dt>
        <dd v-if="Array.isArray(value)">
          <span v-if="!value.length" class="text-gray-400">—</span>
          <template v-else>
            <button @click="toggleArray(key)" class="text-xs text-gray-400 hover:text-gray-600 uppercase tracking-widest cursor-pointer">
              {{ openArrays.has(key) ? '▲' : '▼' }} {{ value.length }}
            </button>
            <template v-if="openArrays.has(key)">
              <div v-for="(child, i) in value" :key="i" class="mt-1 mb-2 pl-2 border-l-2 border-gray-200">
                <template v-if="typeof child === 'object' && child !== null">
                  <div v-for="(cv, ck) in child" :key="ck" class="flex gap-2">
                    <span class="text-gray-400 shrink-0">{{ ck }}</span>
                    <span>{{ cv }}</span>
                  </div>
                </template>
                <template v-else>{{ child }}</template>
              </div>
            </template>
          </template>
        </dd>
        <dd v-else>{{ value ?? '—' }}</dd>
      </template>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ item: Record<string, unknown> }>()
const open = ref(false)
const openArrays = ref(new Set<string | number>())

function toggleArray(key: string | number) {
  if (openArrays.value.has(key)) openArrays.value.delete(key)
  else openArrays.value.add(key)
}
</script>
