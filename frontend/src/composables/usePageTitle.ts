import { watchEffect, toValue, type MaybeRefOrGetter } from 'vue'

/** The server puts the app's name in the page, with the slot off live data: "DTV Tracker (Preview)". */
function siteName(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="dtv-site-name"]')?.content || 'DTV Tracker'
}

export function usePageTitle(title: MaybeRefOrGetter<string>) {
  watchEffect(() => {
    const t = toValue(title)
    if (t) document.title = `${t} | ${siteName()}`
  })
}
