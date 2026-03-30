<template>
  <!-- Three-column hero layout: title block | main content | aside panel -->
  <!-- On mobile: stacks title → main → aside -->
  <div class="grid grid-cols-1 md:grid-cols-3 items-stretch">
    <div class="overflow-visible self-start">
      <slot name="title" />
    </div>
    <div class="self-stretch">
      <slot name="main" />
    </div>
    <div class="min-w-0">
      <slot name="aside" />
    </div>
  </div>
</template>
