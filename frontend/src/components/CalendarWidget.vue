<template>
  <div ref="el" class="w-full bg-dtv-sand p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2 gap-4">
      <button class="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer text-dtv-dark hover:bg-dtv-green/20" @click="navigateMonth(-1)">
        🞀
      </button>
      <span class="font-body text-black text-base uppercase tracking-wide">
        {{ formatMonthYear(currentYear, currentMonth) }}
      </span>
      <button class="w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer text-dtv-dark hover:bg-dtv-green/20" @click="navigateMonth(1)">
        🞂
      </button>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-7">
      <!-- Day name headers -->
      <div
        v-for="name in DAY_NAMES"
        :key="name"
        class="text-center text-xs text-black/60 pb-1 uppercase tracking-wide"
      >{{ name }}</div>

      <!-- Previous month overflow days -->
      <div
        v-for="day in prevMonthDays"
        :key="`prev-${day}`"
        :class="adjacentCellClasses(prevMonthDateKey(day))"
        @click="handleAdjacentDayClick(prevMonthDateKey(day), -1)"
      >
        <span class="leading-none">{{ day }}</span>
        <span
          v-if="sessionIndex.has(prevMonthDateKey(day))"
          class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/50"
        />
      </div>

      <!-- Day cells -->
      <div
        v-for="day in daysInMonth"
        :key="day"
        :class="cellClasses(day)"
        @click="handleDayClick(day)"
      >
        <span class="leading-none">{{ day }}</span>
        <!-- One dot per session: filled = registered/attended, outline = not registered -->
        <span
          v-if="sessionIndex.has(dateKey(day))"
          class="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5"
        >
          <span
            v-for="s in sessionIndex.get(dateKey(day))"
            :key="s.id"
            :class="[
              'w-1.5 h-1.5 rounded-full',
              (s.isRegistered || s.isAttended) ? 'bg-white' : 'border border-white bg-transparent'
            ]"
          />
        </span>
      </div>

      <!-- Next month overflow days -->
      <div
        v-for="day in nextMonthDays"
        :key="`next-${day}`"
        :class="adjacentCellClasses(nextMonthDateKey(day))"
        @click="handleAdjacentDayClick(nextMonthDateKey(day), 1)"
      >
        <span class="leading-none">{{ day }}</span>
        <span
          v-if="sessionIndex.has(nextMonthDateKey(day))"
          class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/50"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Session } from '../types/session'

const props = defineProps<{
  sessions: Session[]
  modelValue?: string
  immediateConfirm?: boolean  // emit 'confirm' on first click rather than requiring a second click
}>()

const emit = defineEmits<{
  'update:modelValue': [dateKey: string]
  'select': [sessions: Session[]]
  'confirm': [sessions: Session[]]
}>()

const el = ref<HTMLElement | null>(null)

const DAY_NAMES = ['Mo','Tu','We','Th','Fr','Sa','Su']

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

const today = new Date()
const todayKey = today.toISOString().substring(0, 10)

const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
const selectedKey = ref<string | null>(props.modelValue ?? null)

// Build index: dateKey → sessions[]
const sessionIndex = computed(() => {
  const index = new Map<string, Session[]>()
  for (const s of props.sessions) {
    const key = s.date?.substring(0, 10)
    if (!key) continue
    if (!index.has(key)) index.set(key, [])
    index.get(key)!.push(s)
  }
  return index
})

const daysInMonth = computed(() =>
  new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
)

const trailingBlanks = computed(() =>
  42 - monthOffset.value - daysInMonth.value
)

// Monday-start offset
const monthOffset = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1).getDay()
  return (firstDay + 6) % 7
})

// Previous month
const prevMonthYear = computed(() => currentMonth.value === 0 ? currentYear.value - 1 : currentYear.value)
const prevMonth = computed(() => currentMonth.value === 0 ? 11 : currentMonth.value - 1)
const daysInPrevMonth = computed(() => new Date(prevMonthYear.value, prevMonth.value + 1, 0).getDate())
const prevMonthDays = computed(() =>
  Array.from({ length: monthOffset.value }, (_, i) => daysInPrevMonth.value - monthOffset.value + 1 + i)
)

// Next month
const nextMonthYear = computed(() => currentMonth.value === 11 ? currentYear.value + 1 : currentYear.value)
const nextMonth = computed(() => currentMonth.value === 11 ? 0 : currentMonth.value + 1)
const nextMonthDays = computed(() =>
  Array.from({ length: trailingBlanks.value }, (_, i) => i + 1)
)

function prevMonthDateKey(day: number): string {
  const m = String(prevMonth.value + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${prevMonthYear.value}-${m}-${d}`
}

function nextMonthDateKey(day: number): string {
  const m = String(nextMonth.value + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${nextMonthYear.value}-${m}-${d}`
}

function adjacentCellClasses(key: string): string[] {
  const hasSession = sessionIndex.value.has(key)
  const hasDot = sessionIndex.value.get(key)?.some(s => s.isRegistered || s.isAttended || s.isRegular) ?? false
  return [
    'relative aspect-square w-full flex flex-col items-center justify-center text-sm select-none',
    hasSession ? 'bg-dtv-gold/40 text-white/70 cursor-pointer hover:brightness-110' : 'text-dtv-dark/25 cursor-default',
    hasDot ? 'pb-2' : '',
  ].filter(Boolean)
}

function handleAdjacentDayClick(key: string, delta: number) {
  navigateMonth(delta)
  if (sessionIndex.value.has(key)) selectDate(key)
}

function dateKey(day: number): string {
  const m = String(currentMonth.value + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${currentYear.value}-${m}-${d}`
}

function cellClasses(day: number): string[] {
  const key = dateKey(day)
  const hasSession = sessionIndex.value.has(key)
  const isSelected = key === selectedKey.value
  const isToday = key === todayKey
  const hasDot = hasSession

  return [
    'relative aspect-square w-full flex flex-col items-center justify-center text-sm select-none',
    isToday ? 'font-bold' : '',
    hasSession && !isSelected ? 'bg-dtv-gold text-white cursor-pointer hover:brightness-110' : '',
    isSelected ? '!bg-dtv-green !text-white cursor-pointer' : '',
    !hasSession ? 'bg-white text-dtv-dark/40 cursor-default' : '',
    hasDot ? 'pb-2' : '',
  ].filter(Boolean)
}


function handleDayClick(day: number) {
  const key = dateKey(day)
  if (!sessionIndex.value.has(key)) return
  if (key === selectedKey.value || props.immediateConfirm) {
    emit('confirm', sessionIndex.value.get(key)!)
    return
  }
  selectDate(key)
  el.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function selectDate(key: string) {
  if (!sessionIndex.value.has(key)) return
  selectedKey.value = key
  const [y, m] = key.split('-').map(Number)
  currentYear.value = y
  currentMonth.value = m - 1
  emit('update:modelValue', key)
  emit('select', sessionIndex.value.get(key)!)
}

function navigateMonth(delta: number) {
  currentMonth.value += delta
  if (currentMonth.value < 0) { currentMonth.value = 11; currentYear.value-- }
  if (currentMonth.value > 11) { currentMonth.value = 0; currentYear.value++ }
}

function findDefaultKey(): string | null {
  let nextKey: string | null = null
  let lastKey: string | null = null

  // Prefer the user's own next registered session
  for (const [key, daySessions] of sessionIndex.value) {
    if (!daySessions.some(s => s.isRegistered || s.isAttended)) continue
    if (key >= todayKey) {
      if (!nextKey || key < nextKey) nextKey = key
    } else {
      if (!lastKey || key > lastKey) lastKey = key
    }
  }
  if (nextKey) return nextKey

  // Fall back to global next/last session
  for (const key of sessionIndex.value.keys()) {
    if (key >= todayKey) {
      if (!nextKey || key < nextKey) nextKey = key
    } else {
      if (!lastKey || key > lastKey) lastKey = key
    }
  }
  return nextKey ?? lastKey ?? null
}

watch(() => props.modelValue, (val) => {
  if (val && val !== selectedKey.value) selectDate(val)
  else if (!val) selectedKey.value = null
})

// Re-run selection when sessions load (store fetch completes after mount)
watch(() => props.sessions, () => {
  if (selectedKey.value && sessionIndex.value.has(selectedKey.value)) {
    // Sessions just arrived — re-emit for the already-selected key (e.g. from URL)
    selectDate(selectedKey.value)
  } else {
    // No valid selection — pick the best default for these sessions
    selectedKey.value = null
    const key = findDefaultKey()
    if (key) selectDate(key)
  }
})

onMounted(() => {
  if (!selectedKey.value) {
    const key = findDefaultKey()
    if (key) selectDate(key)
  } else {
    const [y, m] = selectedKey.value.split('-').map(Number)
    currentYear.value = y
    currentMonth.value = m - 1
    emit('select', sessionIndex.value.get(selectedKey.value) ?? [])
  }
})
</script>
