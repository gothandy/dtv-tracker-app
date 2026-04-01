<template>
  <header class="bg-dtv-green overflow-visible">
    <div class="max-w-5xl mx-auto px-2.5 py-1 flex items-center justify-between relative">
      <!-- Logo — overflows 25% below header -->
      <RouterLink to="/" class="flex items-center gap-3 no-underline relative z-[60]" style="margin-bottom: -10px">
        <img src="/img/logo.png" alt="DTV" class="h-20 w-20" style="transform: translateY(5%)" />
        <span class="font-display text-white text-2xl md:text-3xl uppercase tracking-wide -translate-y-1">DTV Tracker</span>
      </RouterLink>

      <!-- Burger button -->
      <button @click.stop="toggleMenu" class="ml-auto p-2 cursor-pointer" aria-label="Toggle menu">
        <img v-if="!open" src="/svg/burger.svg" alt="Menu" class="h-8 w-8 brightness-0 invert" />
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2.5">
          <path stroke-linecap="square" stroke-linejoin="miter" d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </button>

      <!-- Dropdown nav -->
      <div v-if="open" class="absolute top-full right-0 z-50 w-72 bg-black">
        <nav class="flex flex-col px-4 py-4 gap-1">
          <RouterLink to="/" @click="open = false" class="text-white font-bold uppercase tracking-wide text-sm py-3 border-b border-white/10 hover:text-dtv-green transition-colors">Home</RouterLink>
          <RouterLink to="/sessions" @click="open = false" class="text-white font-bold uppercase tracking-wide text-sm py-3 border-b border-white/10 hover:text-dtv-green transition-colors">Sessions</RouterLink>
          <RouterLink to="/groups" @click="open = false" class="text-white font-bold uppercase tracking-wide text-sm py-3 border-b border-white/10 hover:text-dtv-green transition-colors">Groups</RouterLink>
          <RouterLink v-if="isTrusted" to="/profiles" @click="open = false" class="text-white font-bold uppercase tracking-wide text-sm py-3 border-b border-white/10 hover:text-dtv-green transition-colors">Volunteers</RouterLink>
          <RouterLink v-if="isAdmin" to="/admin" @click="open = false" class="text-white font-bold uppercase tracking-wide text-sm py-3 border-b border-white/10 hover:text-dtv-green transition-colors">Tools</RouterLink>
          <RouterLink to="/about" @click="open = false" class="text-white font-bold uppercase tracking-wide text-sm py-3 border-b border-white/10 hover:text-dtv-green transition-colors">About</RouterLink>

          <template v-if="ready">
            <RouterLink v-if="user?.profileSlug" :to="`/profiles/${user.profileSlug}`"
              @click="open = false"
              class="text-dtv-green font-bold uppercase tracking-wide text-sm py-3 border-b border-white/10 hover:text-white transition-colors">
              {{ user.displayName }}
            </RouterLink>
            <a v-if="user" href="/auth/logout" class="text-dtv-green font-bold uppercase tracking-wide text-sm py-3 border-b border-white/10 hover:text-white transition-colors">
              Logout
            </a>
            <RouterLink v-else to="/login" @click="open = false" class="text-dtv-green font-bold uppercase tracking-wide text-sm py-3 border-b border-white/10 hover:text-white transition-colors">
              Login
            </RouterLink>
          </template>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRole } from '../composables/useRole'

const open = ref(false)
const { user, ready, isAdmin, isTrusted } = useRole()

function toggleMenu() {
  open.value = !open.value
}

function onClickOutside(e: MouseEvent) {
  if (open.value && !(e.target as HTMLElement).closest('header')) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

