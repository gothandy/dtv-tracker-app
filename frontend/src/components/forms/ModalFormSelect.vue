<template>
  <select
    v-model="model"
    class="modal-form-control"
    :class="{ 'modal-form-control--placeholder': placeholder }"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <slot />
  </select>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const model = defineModel<string | number | null>({ required: true })

withDefaults(defineProps<{
  placeholder?: boolean
  disabled?: boolean
}>(), {
  placeholder: false,
  disabled: false,
})
</script>
