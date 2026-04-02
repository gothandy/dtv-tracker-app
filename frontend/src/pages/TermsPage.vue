<template>
  <DefaultLayout>
    <h1 class="sr-only">Terms of Use</h1>
    <PageTitle>Terms of Use</PageTitle>
    <div class="px-6 pt-4 pb-8">
    <p class="text-sm text-gray-500 mb-8">Dean Trail Volunteers &mdash; Registered Charity 1208988<br>Last updated: March 2026</p>

    <div class="prose max-w-none text-black space-y-6">
      <p>These terms govern your use of the DTV Tracker application at <strong>tracker.dtv.org.uk</strong>, operated by Dean Trail Volunteers (Registered Charity 1208988).</p>

      <section>
        <h2 class="text-xl font-bold mb-2">Who can use this application</h2>
        <p>DTV Tracker is an internal tool for Dean Trail Volunteers trusted users and volunteers. Some parts of the application are publicly accessible without an account. Full access requires an invitation from a DTV administrator.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Acceptable use</h2>
        <p>You agree to use DTV Tracker only for its intended purpose: recording and viewing volunteer activity for Dean Trail Volunteers. You must not:</p>
        <ul class="list-disc pl-6 space-y-1">
          <li>Attempt to access data belonging to other volunteers without authorisation.</li>
          <li>Use the application to store or share content that is unlawful, offensive, or unrelated to DTV volunteer activity.</li>
          <li>Attempt to circumvent security controls or access the application by means other than the provided login options.</li>
          <li>Use automated tools to scrape or bulk-download data without permission.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Uploaded media</h2>
        <p>When you upload photos or videos via DTV Tracker, you confirm that:</p>
        <ul class="list-disc pl-6 space-y-1">
          <li>You have the right to share the content.</li>
          <li>The content shows volunteer activity and is appropriate for an internal charity system.</li>
          <li>You consent to DTV storing and using the media for volunteer record-keeping and reporting.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Accuracy of records</h2>
        <p>DTV Tracker is the system of record for volunteer hours and attendance. If you believe a record is inaccurate, please contact a DTV administrator to request a correction. Do not attempt to edit records you are not authorised to change.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Availability</h2>
        <p>DTV Tracker is provided as a best-efforts service. We do not guarantee uninterrupted availability. Scheduled maintenance or unexpected outages may occasionally affect access.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Limitation of liability</h2>
        <p>Dean Trail Volunteers is a volunteer-run charity. DTV Tracker is provided without warranty of any kind. To the extent permitted by law, Dean Trail Volunteers accepts no liability for loss or damage arising from use of this application.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Changes to these terms</h2>
        <p>We may update these terms from time to time. Continued use of DTV Tracker following any update constitutes acceptance of the revised terms.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Governing law</h2>
        <p>These terms are governed by the laws of England and Wales.</p>
      </section>

      <section>
        <h2 class="text-xl font-bold mb-2">Contact</h2>
        <p>For questions about these terms, contact Dean Trail Volunteers via the details in our <a href="https://docs.dtv.org.uk/it-and-data/data-protection/2025-08-01-dtv-privacy-notice.pdf" target="_blank" rel="noopener" class="text-dtv-green hover:underline">Privacy Notice (PDF)</a>.</p>
      </section>
    </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import DefaultLayout from '../layouts/DefaultLayout.vue'
import { usePageTitle } from '../composables/usePageTitle'
import PageTitle from '../components/PageTitle.vue'

usePageTitle('Terms of Use')
</script>
