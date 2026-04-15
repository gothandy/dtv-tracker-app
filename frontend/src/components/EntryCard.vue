<template>
  <div class="ec-row">

    <!-- Card body -->
    <div class="ec-card" :class="{ 'ec-card--checked': checkedIn, 'ec-card--cancelled': cancelled }">
      <div class="ec-card-left">

        <button v-if="allowEdit" class="ec-name ec-name--btn" @click="emit('editEntry')">
          {{ title }}
        </button>
        <RouterLink v-else-if="titleTo" :to="titleTo" class="ec-name">
          {{ title }}
        </RouterLink>
        <span v-else class="ec-name ec-name--plain">{{ title }}</span>

        <span
          v-for="icon in icons"
          :key="icon.alt"
          class="ec-icon"
          :class="icon.color ? 'icon-' + icon.color : ''"
          :title="icon.alt"
        >
          <img :src="'/icons/' + icon.icon" :alt="icon.alt" />
        </span>

      </div>
      <div class="ec-card-right">
        <span v-if="!allowEdit && allowCancel && hours > 0" class="ec-hours-label">{{ hours }}h</span>
      </div>
    </div>

    <!-- Check/hours control -->
    <template v-if="allowEdit">
      <div v-if="working" class="ec-check ec-check--on">
        <img src="/icons/gear.svg" class="ec-spinner svg-white" />
      </div>
      <input
        v-else-if="showHours || hours > 0"
        ref="hoursInput"
        type="number"
        class="ec-check ec-check--hours"
        :value="hours > 0 ? hours : 3"
        min="0"
        step="0.5"
        @blur="onHoursChange(($event.target as HTMLInputElement))"
        @keydown.enter.prevent="onHoursChange(($event.target as HTMLInputElement))"
      />
      <label
        v-else
        class="ec-check ec-check--checkbox"
        :class="{ 'ec-check--on': checkedIn }"
      >
        <input type="checkbox" class="ec-check__input" :checked="checkedIn" @click.prevent="onCheckClick" />
        <img v-if="checkedIn" src="/icons/tick.svg" class="ec-tick svg-white" />
      </label>
    </template>
    <button v-else-if="allowCancel" class="ec-check ec-check--cancel" @click="emit('cancel')" title="Cancel">
      <img src="/icons/close.svg" class="ec-tick svg-dirt-dark" />
    </button>
    <div v-else-if="hours > 0" class="ec-check ec-check--hours-static">{{ hours }}h</div>
    <div v-else class="ec-check ec-check--static" :class="{ 'ec-check--on': checkedIn }" />

  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import type { TagIcon } from '../utils/tagIcons'

const props = defineProps<{
  title: string
  titleTo?: RouteLocationRaw
  checkedIn: boolean
  hours: number
  icons?: TagIcon[]
  allowEdit?: boolean
  allowCancel?: boolean
  working?: boolean
  cancelled?: boolean
}>()

const emit = defineEmits<{
  'update': [checkedIn: boolean, hours: number]
  'editEntry': []
  'cancel': []
}>()

const showHours = ref(false)
const hoursInput = ref<HTMLInputElement | null>(null)
const handlingHours = ref(false)

function onCheckClick() {
  if (!props.checkedIn) {
    emit('update', true, props.hours)
  } else {
    showHours.value = true
    nextTick(() => hoursInput.value?.focus())
  }
}

function onHoursChange(input: HTMLInputElement) {
  if (handlingHours.value) return
  handlingHours.value = true
  const val = input.value.trim()
  if (val === '') {
    showHours.value = false
    emit('update', false, 0)
  } else {
    const h = parseFloat(val)
    if (!isNaN(h) && h > 0 && h !== props.hours) emit('update', true, h)
  }
  handlingHours.value = false
}
</script>

<style scoped>
.ec-row {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.ec-check {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-self: flex-start;
  background: var(--color-dtv-gold);
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ec-check--on {
  background: var(--color-dtv-green);
}
.ec-check--working { pointer-events: none; cursor: default; }
.ec-check--hours:focus-visible {
  outline: 2px solid var(--color-dtv-dark);
  outline-offset: 3px;
}

.ec-check__input {
  position: absolute;
  inset: 0;
  appearance: none;
  -webkit-appearance: none;
  opacity: 0;
  margin: 0;
  cursor: pointer;
  z-index: 1;
}
.ec-check--checkbox:has(.ec-check__input:focus-visible) {
  outline: 2px solid var(--color-dtv-dark);
  outline-offset: 3px;
}

.ec-tick {
  width: 1.25rem;
  height: 1.25rem;
}

.ec-spinner {
  display: block;
  width: 1.75rem;
  height: 1.75rem;
  animation: ec-spin 1.5s linear infinite;
}
@keyframes ec-spin { to { transform: rotate(360deg); } }

.ec-check--hours {
  background: var(--color-dtv-green);
  border: none;
  color: var(--color-white);
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 600;
  text-align: center;
  cursor: text;
  padding: 0;
}
.ec-check--hours::-webkit-inner-spin-button,
.ec-check--hours::-webkit-outer-spin-button { -webkit-appearance: none; }

.ec-check--hours-static,
.ec-check--static {
  cursor: default;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-dtv-sand);
  border: none;
}

.ec-card {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--color-dtv-sand);
  border-left: 4px solid transparent;
  gap: 0.5rem;
}
.ec-card--checked { border-left-color: var(--color-dtv-green); }
.ec-card--cancelled { opacity: 0.5; }
.ec-card--cancelled .ec-name { text-decoration: line-through; }

.ec-card-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.25rem;
  overflow: hidden;
}

.ec-card-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}
.ec-hours-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.ec-name {
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex-shrink: 1;
  text-decoration: none;
}
.ec-name:hover { text-decoration: underline; }
.ec-name--plain { cursor: default; }
.ec-name--plain:hover { text-decoration: none; }
.ec-name--btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.ec-icon {
  display: inline-flex;
  align-items: flex-start;
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  align-self: flex-start;
}
.ec-icon img { width: 100%; height: 100%; object-fit: contain; }

.ec-check--cancel {
  background: var(--color-dtv-dirt-light);
  cursor: pointer;
}
.ec-check--cancel:hover { background: var(--color-dtv-dirt); }
.ec-check--cancel:hover img { filter: brightness(0) invert(1); }
</style>
