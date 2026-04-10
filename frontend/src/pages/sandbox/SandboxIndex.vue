<template>
  <DefaultLayout>
    <div class="sandbox">
      <h1>Sandbox</h1>

      <section>
        <h2>Foundation</h2>
        <nav>
          <RouterLink to="/sandbox/colour-palette">Brand Palette</RouterLink>
          <RouterLink to="/sandbox/app-button">AppButton</RouterLink>
          <RouterLink to="/sandbox/layout-columns">LayoutColumns</RouterLink>
          
          
        </nav>
      </section>

      <section>
        <h2>Forms and Modals</h2>
        <nav>
          <RouterLink to="/sandbox/modal-layout">ModalLayout</RouterLink>
          <RouterLink to="/sandbox/modals">All Modals</RouterLink>
          <RouterLink to="/sandbox/form-components">Form Layout and Components</RouterLink>
        </nav>
      </section>

      <section>
        <h2>Widgets</h2>
        <nav>
          <RouterLink to="/sandbox/calendar-widget">CalendarWidget</RouterLink>
          <RouterLink to="/sandbox/fy-bar-chart">FyBarChart</RouterLink>
          <RouterLink to="/sandbox/tag-cloud">TagCloud</RouterLink>   
          <RouterLink to="/sandbox/media-card">MediaCard</RouterLink>
          <RouterLink to="/sandbox/media-carousel">MediaCarousel</RouterLink>
          <RouterLink to="/sandbox/session-view-tags">SessionViewTags</RouterLink>
        </nav>
      </section>

      <section>
        <h2>Group and Session Lists</h2>
        <nav>
          <RouterLink to="/sandbox/action-bars">Action Bars</RouterLink>
          <RouterLink to="/sandbox/filter-components">Filter Components</RouterLink>
          <RouterLink to="/sandbox/session-card">SessionCard</RouterLink>
          <RouterLink to="/sandbox/group-card">GroupCard</RouterLink>
        </nav>
      </section>

      <section>
        <h2>Session and Profile Entry Lists</h2>
        <nav>
          <RouterLink to="/sandbox/concertina-layout">ConcertinaLayout</RouterLink>
          <RouterLink to="/sandbox/entry-card">EntryCard</RouterLink>
          <RouterLink to="/sandbox/entry-list">EntryList</RouterLink>
        </nav>
      </section>


      <section>
        <h2>Not included — test on main site</h2>
        <ul class="not-included">
          <li>SessionDetailGallery — requires live SharePoint media; test via session detail page</li>
        </ul>
      </section>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import DefaultLayout from '../../layouts/DefaultLayout.vue'
</script>

<style scoped>
.sandbox h2 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

a {
  color: var(--color-dtv-green);
  text-decoration: none;
  font-weight: 600;
  background: var(--color-dtv-light);
  padding: 0.3rem 0.75rem;
  border-radius: 2px;
  font-size: 0.9rem;
}

a:hover {
  text-decoration: underline;
}

.not-included {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.not-included li {
  background: var(--color-dtv-light);
  padding: 0.3rem 0.75rem;
  border-radius: 2px;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
</style>
