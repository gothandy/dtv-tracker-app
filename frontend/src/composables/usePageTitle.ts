import { watchEffect, toValue, type MaybeRefOrGetter } from 'vue'
import { siteName } from '../utils/siteInfo'

export function usePageTitle(title: MaybeRefOrGetter<string>) {
  watchEffect(() => {
    const t = toValue(title)
    if (t) document.title = `${t} | ${siteName()}`
  })
}
