<template>
  <input
    v-model="model"
    class="modal-form-control"
    :class="{ 'modal-form-control--narrow': narrow }"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :min="min"
    :max="max"
    :step="step"
  />
</template>

<script setup lang="ts">
const model = defineModel<string | number | null>({ required: true })

withDefaults(defineProps<{
  type?: string
  placeholder?: string
  disabled?: boolean
  autocomplete?: string
  narrow?: boolean
  min?: string | number
  max?: string | number
  step?: string | number
}>(), {
  type: 'text',
  disabled: false,
  narrow: false,
})
</script>
