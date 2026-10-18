<template>
  <div class="list-item-card">
    <div class="list-item-card__body">
      <p class="list-item-card__title">{{ template.title }}</p>
      <p class="list-item-card__subtext">{{ template.subject }}</p>
      <p v-if="template.text" class="list-item-card__description template-card__text">{{ template.text }}</p>
    </div>
    <div class="list-item-card__footer">
      <div class="list-item-card__stats">
        <span>{{ template.context }}</span>
      </div>
      <RouterLink :to="templatePath(template.id)"><AppButton label="View" /></RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { templatePath } from '../../router/index'
import type { TemplateResponse } from '../../../../types/api-responses'
import AppButton from '../AppButton.vue'

defineProps<{ template: TemplateResponse }>()
</script>

<style scoped>
/* Keep the text's line breaks, within the card's three-line clamp. */
.template-card__text {
  white-space: pre-line;
}
</style>
