<template>
  <div class="ls-wrap" role="status" aria-live="polite">
    <img src="/icons/gear.svg" class="ls-gear svg-black" alt="" />
    <span class="sr-only">Loading</span>
  </div>
</template>

<style scoped>
.ls-wrap {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.ls-gear {
  width: 2rem;
  height: 2rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
