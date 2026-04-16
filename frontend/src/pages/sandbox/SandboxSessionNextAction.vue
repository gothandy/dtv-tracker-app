<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Session Next Action</h1>
      <p class="sandbox-note">All 6 CTA states for a bookable session, plus valid multi-state combinations. Logic lives in SessionDetailPage; these components are display only.</p>

      <h2>IsBooked — user has a booking</h2>
      <div class="sna-frame">
        <SessionActionsIsBooked />
      </div>
      <div class="sna-frame">
        <SessionActionsIsBooked :working="true" />
      </div>
      <div class="sna-frame">
        <SessionActionsIsBooked error="Failed to cancel — please try again" />
      </div>

      <h2>SessionFull — sold out</h2>
      <div class="sna-frame">
        <SessionActionsSessionFull group-key="sheepskull" />
      </div>

      <h2>IsBooked + SessionFull — booked on a sold-out session</h2>
      <div class="sna-frame">
        <SessionActionsIsBooked />
        <SessionActionsSessionFull group-key="sheepskull" />
      </div>

      <h2>LogIn — not authenticated</h2>
      <div class="sna-frame">
        <SessionActionsLogIn />
      </div>

      <h2>BookNew — new person, spaces available</h2>
      <div class="sna-frame">
        <SessionActionsBookNew eventbrite-url="https://www.eventbrite.co.uk/e/123456789" />
      </div>

      <h2>LogIn + BookNew — public visitor, new spaces available</h2>
      <div class="sna-frame">
        <SessionActionsLogIn />
        <SessionActionsBookNew eventbrite-url="https://www.eventbrite.co.uk/e/123456789" />
      </div>

      <h2>BookRegular — repeat attendee, spaces available</h2>
      <div class="sna-frame">
        <SessionActionsBookRegular />
      </div>
      <div class="sna-frame">
        <SessionActionsBookRegular :working="true" />
      </div>
      <div class="sna-frame">
        <SessionActionsBookRegular error="Failed to book — please try again" />
      </div>

      <h2>AllocationFull — session has space but not for this person's path</h2>
      <div class="sna-frame">
        <SessionActionsAllocationFull group-key="sheepskull" />
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SessionActionsIsBooked from '../../components/sessions/actions/SessionActionsIsBooked.vue'
import SessionActionsSessionFull from '../../components/sessions/actions/SessionActionsSessionFull.vue'
import SessionActionsLogIn from '../../components/sessions/actions/SessionActionsLogIn.vue'
import SessionActionsBookNew from '../../components/sessions/actions/SessionActionsBookNew.vue'
import SessionActionsBookRegular from '../../components/sessions/actions/SessionActionsBookRegular.vue'
import SessionActionsAllocationFull from '../../components/sessions/actions/SessionActionsAllocationFull.vue'

usePageTitle('Sandbox — Session Next Action')
</script>

<style scoped>
.sandbox-note {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.sna-frame {
  border: 1px solid var(--color-border);
  max-width: 22rem;
  margin-bottom: 1.5rem;
}
</style>
