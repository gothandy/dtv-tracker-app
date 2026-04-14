<template>
  <DefaultLayout>
    <div class="sandbox">
      <h1>Sandbox</h1>

      <section>
        <h2>Foundation</h2>
        <nav>
          <RouterLink to="/sandbox/colour-palette">Brand Palette</RouterLink>
          <RouterLink to="/sandbox/icons">Icons</RouterLink>
          <RouterLink to="/sandbox/font-stack">Font Stack</RouterLink>
          <RouterLink to="/sandbox/app-button">AppButton</RouterLink>
          <RouterLink to="/sandbox/layout-columns">LayoutColumns</RouterLink>
          
          
        </nav>
      </section>

      <section>
        <h2>Modals and Forms</h2>
        <nav>
          <RouterLink to="/sandbox/modal-layout">ModalLayout</RouterLink>
          <RouterLink to="/sandbox/modals">All Modals</RouterLink>
          <RouterLink to="/sandbox/form-components">Form Layout and Components</RouterLink>
          <RouterLink to="/sandbox/flash-message">FlashMessage</RouterLink>
        </nav>
      </section>

      <section>
        <h2>Task Pages</h2>
        <nav>
          <RouterLink to="/sandbox/login-page">LoginPage</RouterLink>
          <RouterLink to="/sandbox/consent-page">ConsentPage</RouterLink>
          <RouterLink to="/sandbox/upload-page">UploadPage</RouterLink>
          <RouterLink to="/sandbox/error-pages">Error Pages</RouterLink>
        </nav>
      </section>

      <section>
        <h2>Widgets</h2>
        <nav>
          <RouterLink to="/sandbox/calendar-widget">CalendarWidget</RouterLink>
          <RouterLink to="/sandbox/fy-bar-chart">FyBarChart</RouterLink>
          <RouterLink to="/sandbox/term-cloud">TermCloud</RouterLink>   
          <RouterLink to="/sandbox/media-card">MediaCard</RouterLink>
          <RouterLink to="/sandbox/media-carousel">MediaCarousel</RouterLink>
          <RouterLink to="/sandbox/session-term-list">SessionTermList</RouterLink>
        </nav>
      </section>

      <section>
        <h2>Group, Session and Profile Lists</h2>
        <nav>
          <RouterLink to="/sandbox/action-bars">Action Bars</RouterLink>
          <RouterLink to="/sandbox/filter-components">Filter Components</RouterLink>
          <RouterLink to="/sandbox/session-card">SessionCard</RouterLink>
          <RouterLink to="/sandbox/group-card">GroupCard</RouterLink>
          <RouterLink to="/sandbox/profile-list-item">ProfileListItem</RouterLink>
          <RouterLink to="/sandbox/profile-list-results">ProfileListResults</RouterLink>
        </nav>
      </section>

      <section>
        <h2>Session and Profile Entry Lists</h2>
        <nav>
          <RouterLink to="/sandbox/concertina-layout">ConcertinaLayout</RouterLink>
          <RouterLink to="/sandbox/entry-card">EntryCard</RouterLink>
          <RouterLink to="/sandbox/entry-list">EntryList</RouterLink>
          <RouterLink to="/sandbox/profile-record-list">ProfileRecordList</RouterLink>
          <RouterLink to="/sandbox/profile-duplicate-warning">ProfileDuplicateWarning</RouterLink>
          <RouterLink to="/sandbox/profile-linked-accounts">ProfileLinkedAccounts</RouterLink>
          <RouterLink to="/sandbox/regular-list">RegularList</RouterLink>
          <RouterLink to="/sandbox/regular-item">RegularItem</RouterLink>
        </nav>
      </section>


      <section>
        <h2>Homepage</h2>
        <nav>
          <RouterLink to="/sandbox/personal-prompt">PersonalPrompt</RouterLink>
          <RouterLink to="/sandbox/personal-contribution">PersonalContribution</RouterLink>
        </nav>
      </section>

      <section>
        <h2>Not included — test on main site</h2>
        <ul class="prose">
          <li>SessionDetailGallery — requires live SharePoint media; test via session detail page</li>
          <li>SessionDetailBook — booking CTA; test via session detail (future bookable session)</li>
          <li>SessionDetailHeader — session info display; test via session detail page</li>
          <li>SessionDetailLogin — auth prompt; test via session detail page (logged out)</li>
          <li>SessionDetailStats — stats table; test via session detail page (past session)</li>
          <li>SessionDetailGroupTeaser — next session teaser; test via session detail page (past session)</li>
          <li>SessionEntryList — check-in entry workflow; test via session detail page (operational user)</li>
          <li>SessionConcertina — concertina session picker; test via home page calendar</li>
          <li>SessionList — session list with grouped dates; test via home or sessions page</li>
          <li>SessionListResults — session card grid with checkboxes; test via sessions page</li>
          <li>GroupDetailHeader — group info display; test via group detail page</li>
          <li>GroupDetailRegulars — regulars management; test via group detail page</li>
          <li>GroupListResults — group card grid; test via groups page</li>
          <li>ProfileEntryList — profile entry list; test via profile detail page</li>
          <li>EntryIconPicker — tag toggle buttons; test via entry detail or session entry list</li>
          <li>ProfilePicker — volunteer search/select; test via add entry or entry edit modal</li>
          <li>TermPicker — term store tag picker; test via session view tags</li>
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

</style>
