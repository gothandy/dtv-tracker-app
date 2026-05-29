<template>
  <input
    v-model="model"
    type="checkbox"
    class="modal-form-checkbox"
    :disabled="disabled"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const model = defineModel<boolean>({ required: true })

withDefaults(defineProps<{ disabled?: boolean }>(), {
  disabled: false,
})
</script>
