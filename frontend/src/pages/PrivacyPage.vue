<template>
  <DefaultLayout>
    <h1 class="text-dtv-green text-3xl uppercase mb-2">Privacy Policy</h1>
    <p class="text-sm text-gray-500 mb-8">Dean Trail Volunteers &mdash; Registered Charity 1208988<br>Last updated: March 2026</p>

    <div class="prose max-w-none text-black space-y-6">
      <p>This privacy policy explains how the DTV Tracker application (<strong>tracker.dtv.org.uk</strong>) collects, uses, and stores your personal data. It applies specifically to this application. For the full Dean Trail Volunteers privacy notice, see our <a href="https://docs.dtv.org.uk/it-and-data/data-protection/2025-08-01-dtv-privacy-notice.pdf" target="_blank" rel="noopener" class="text-dtv-green hover:underline">DTV Privacy Notice (PDF)</a>.</p>

      <section>
        <h2 class="text-xl font-bold mb-2">Who we are</h2>
        <p>Dean Trail Volunteers is a registered charity (number 1208988) that manages volunteer activity in the Forest of Dean. DTV Tracker is an internal tool used to record volunteer hours, session attendance, and group membership.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">What data we collect</h2>
        <ul class="list-disc pl-6 space-y-1">
          <li><strong>Name and email address</strong> &mdash; used to identify your volunteer profile and match you to sessions.</li>
          <li><strong>Session attendance and hours</strong> &mdash; records of sessions you have attended and hours contributed.</li>
          <li><strong>Consents and records</strong> &mdash; privacy consent, photo consent, newsletter consent, and charity membership status.</li>
          <li><strong>Photos and videos</strong> &mdash; media you upload relating to specific sessions.</li>
          <li><strong>Authentication details</strong> &mdash; when you sign in via Microsoft, we receive your name, email address, and a unique account identifier. We do not store passwords.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">How we use your data</h2>
        <ul class="list-disc pl-6 space-y-1">
          <li>To record and report volunteer hours and session attendance.</li>
          <li>To manage your membership and consent records.</li>
          <li>To enable you to sign up for sessions and upload media.</li>
          <li>To produce anonymised or aggregated statistics about volunteer activity.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Who can see your data</h2>
        <ul class="list-disc pl-6 space-y-1">
          <li><strong>Admins and Check-In users</strong> &mdash; can view and edit all volunteer data.</li>
          <li><strong>Read-only users</strong> &mdash; can view all data but cannot make changes.</li>
          <li><strong>You (self-service login)</strong> &mdash; can view your own profile, sessions, and uploaded media.</li>
          <li><strong>Public (unauthenticated)</strong> &mdash; can view sessions, groups, and aggregate statistics. Individual volunteer names and profiles are not visible without logging in.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Third-party services</h2>
        <ul class="list-disc pl-6 space-y-1">
          <li><strong>Microsoft (Entra ID)</strong> &mdash; used for authentication. Governed by Microsoft's privacy policy.</li>
          <li><strong>Eventbrite</strong> &mdash; if you register for a DTV event on Eventbrite, your name and email may be imported into DTV Tracker to create or update your volunteer profile.</li>
          <li><strong>Microsoft SharePoint</strong> &mdash; all application data is stored in SharePoint Online on servers within the Microsoft 365 tenancy operated by Dean Trail Volunteers.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">How long we keep your data</h2>
        <p>Volunteer records are retained for as long as you are an active volunteer, and for a reasonable period thereafter in line with our <a href="https://docs.dtv.org.uk/it-and-data/data-protection/2025-08-01-dtv-privacy-notice.pdf" target="_blank" rel="noopener" class="text-dtv-green hover:underline">full privacy notice</a>. You may request deletion of your data by contacting us.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Your rights</h2>
        <p>Under UK GDPR you have the right to access, correct, or request deletion of your personal data. To exercise these rights, contact the DTV data controller as described in our <a href="https://docs.dtv.org.uk/it-and-data/data-protection/2025-08-01-dtv-privacy-notice.pdf" target="_blank" rel="noopener" class="text-dtv-green hover:underline">full privacy notice</a>.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Cookies and sessions</h2>
        <p>DTV Tracker uses a session cookie to keep you logged in. This cookie is essential for the application to function and is deleted when you log out or close your browser session. We do not use tracking or advertising cookies.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Contact</h2>
        <p>For questions about this privacy policy or your data, contact Dean Trail Volunteers via the details in our <a href="https://docs.dtv.org.uk/it-and-data/data-protection/2025-08-01-dtv-privacy-notice.pdf" target="_blank" rel="noopener" class="text-dtv-green hover:underline">full privacy notice</a>.</p>
      </section>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import DefaultLayout from '../layouts/DefaultLayout.vue'
</script>
