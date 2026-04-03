<template>
  <footer class="bg-black">
    <div class="max-w-5xl mx-auto px-4 py-6">
      <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs md:text-sm">
        <RouterLink to="/privacy" class="text-white hover:text-dtv-green transition-colors">Privacy Policy</RouterLink>
        <RouterLink to="/terms" class="text-white hover:text-dtv-green transition-colors">Terms of Use</RouterLink>
        <a href="https://register-of-charities.charitycommission.gov.uk/en/charity-search/-/charity-details/5243025"
           target="_blank" rel="noopener"
           class="text-white hover:text-dtv-green transition-colors">
          Charity 1208988
        </a>
        <span class="text-dtv-green font-bold">&copy; <a href="https://www.deantrailvolunteers.org.uk/"
           class="hover:text-dtv-green transition-colors">2026 Dean Trail Volunteers</a></span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
footer :focus-visible {
  outline-color: white;
}
</style>
