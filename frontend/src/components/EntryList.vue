<template>
  <div class="entry-list">
    <slot />
  </div>
</template>

<style scoped>
.entry-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
}

/* 44em to 64em is specific to the 1/3 > 1/2 > 1 layout */
@media (width >= 44em) {
  .entry-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }

  .entry-list > :deep(*) {
    min-width: 0;
  }
}

@media (width >= 64em) {
  .entry-list {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
