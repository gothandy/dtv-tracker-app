// What the server puts in the page about this tracker (see buildSpaHtml in server.js).

function meta(name: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content || undefined
}

/** The app's name, with the slot off live data: "DTV Tracker (Preview)". */
export function siteName(): string {
  return meta('dtv-site-name') ?? 'DTV Tracker'
}

/** Where people contact the tracker team: this environment's mailbox (TRACKER_SHARED_MAILBOX). */
export function contactEmail(): string {
  const email = meta('dtv-contact-email')
  if (!email) console.error('[siteInfo] dtv-contact-email missing from the page')
  return email ?? ''
}

/** Whose data this is: "Production", or the slot, e.g. "Preview". */
export function environmentName(): string | undefined {
  return meta('dtv-environment')
}
