// Ported from public/js/tag-icons.js

import type { EntryStats } from '../../../types/entry-stats'

export interface TagIcon {
  icon: string
  alt: string
  type: 'badge' | 'tag'
  tag?: string        // hashtag to match in entry.notes, e.g. '#New'
  color?: string      // css modifier: 'orange' | 'red' | 'dark-green' | 'green'
}

export const TAG_ICONS: TagIcon[] = [
  // Badges (profile-level indicators)
  { icon: 'badges/member.svg',  alt: 'Charity Member',    type: 'badge' },
  { icon: 'badges/card.svg',    alt: 'Benefits Card',      type: 'badge' },
  { icon: 'badges/card.svg',    alt: 'Card In Container',  type: 'badge', color: 'orange' },
  { icon: 'badges/group.svg',   alt: 'Group / Company',    type: 'badge' },

  // Entry tags (matched from notes — these remain manual/operational)
  { icon: 'badges/child.svg',      alt: 'Child',            tag: '#Child',      type: 'tag' },
  { icon: 'badges/diglead.svg',    alt: 'Dig Lead',         tag: '#DigLead',    type: 'tag' },
  { icon: 'badges/firstaider.svg', alt: 'First Aider',      tag: '#FirstAider', type: 'tag', color: 'green' },
  { icon: 'badges/csr.svg',        alt: 'CSR',              tag: '#CSR',        type: 'tag' },
  { icon: 'badges/late.svg',       alt: 'Late',             tag: '#Late',       type: 'tag' },
  { icon: 'brands/eventbrite.svg', alt: 'Eventbrite',       tag: '#Eventbrite', type: 'tag' },

  // Legacy tags — still matched from notes for pre-migration entries (stats field absent)
  { icon: 'badges/regular.svg',    alt: 'Regular',          tag: '#Regular',    type: 'tag' },
  { icon: 'badges/new.svg',        alt: 'New',              tag: '#New',        type: 'tag' },
  { icon: 'badges/nophoto.svg',    alt: 'No Photo',         tag: '#NoPhoto',    type: 'tag', color: 'red' },
  { icon: 'status/warning.svg',    alt: 'Duplicate Warning',tag: '#Duplicate',  type: 'tag', color: 'red' },
]

/** Tags shown via notes in picker (operational/manual only — not auto-computed) */
export const EDITABLE_TAG_ICONS = TAG_ICONS.filter(t =>
  t.type === 'tag' && ['#DigLead', '#FirstAider', '#CSR', '#Late', '#Eventbrite'].includes(t.tag ?? '')
)

/** Returns tag icons matched from an entry's notes string */
export function iconsFromNotes(notes: string | undefined): TagIcon[] {
  if (!notes) return []
  return TAG_ICONS.filter(t =>
    t.tag && new RegExp('\\' + t.tag + '\\b', 'i').test(notes)
  )
}

interface EntryIconSource {
  isMember?: boolean
  isGroup?: boolean
  cardStatus?: string
  notes?: string
  stats?: EntryStats
}

/** Builds the full icon list for an entry: profile badges + stats snapshot + notes tags */
export function iconsForEntry(e: EntryIconSource): TagIcon[] {
  const icons: TagIcon[] = []

  // Profile-level badges (always from profile fields)
  if (e.isMember && !e.isGroup) icons.push({ icon: 'badges/member.svg', alt: 'Charity Member', type: 'badge' })
  if (e.cardStatus === 'Accepted')  icons.push({ icon: 'badges/card.svg', alt: 'Benefits Card', type: 'badge' })
  if (e.cardStatus === 'Invited')   icons.push({ icon: 'badges/card.svg', alt: 'Card Invited', type: 'badge', color: 'orange' })
  if (e.isGroup) icons.push({ icon: 'badges/group.svg', alt: 'Group / Company', type: 'badge' })

  if (e.stats) {
    const { snapshot, manual } = e.stats

    // Snapshot: computed at session time
    if (snapshot?.booking === 'New')     icons.push({ icon: 'badges/new.svg',        alt: 'New',              type: 'tag' })
    if (snapshot?.booking === 'Regular') icons.push({ icon: 'badges/regular.svg',    alt: 'Regular',          type: 'tag' })
    if (snapshot?.isChild)               icons.push({ icon: 'badges/child.svg',       alt: 'Child',            type: 'tag' })
    if (manual?.duplicate)               icons.push({ icon: 'status/warning.svg',     alt: 'Duplicate Warning',type: 'tag', color: 'red' })
    if (snapshot?.noPhoto)               icons.push({ icon: 'badges/nophoto.svg',     alt: 'No Photo',         type: 'tag', color: 'red' })
    if (snapshot?.noConsent)             icons.push({ icon: 'badges/noconsent.svg',   alt: 'No Consent',       type: 'tag', color: 'red' })
    // qualified (snapshot) OR took on role that day (manual) — show icon once for either
    if (snapshot?.isDigLead   || manual?.digLead)    icons.push({ icon: 'badges/diglead.svg',    alt: 'Dig Lead',    type: 'tag' })
    if (snapshot?.isFirstAider || manual?.firstAider) icons.push({ icon: 'badges/firstaider.svg', alt: 'First Aider', type: 'tag', color: 'green' })

    // Manual: operational tags from the day
    if (manual?.csr)       icons.push({ icon: 'badges/csr.svg',       alt: 'CSR',        type: 'tag' })
    if (manual?.late)      icons.push({ icon: 'badges/late.svg',       alt: 'Late',       type: 'tag' })
    if (manual?.eventbrite) icons.push({ icon: 'brands/eventbrite.svg', alt: 'Eventbrite', type: 'tag' })
  } else {
    // No stats yet — fall back to Notes tags
    icons.push(...iconsFromNotes(e.notes))
  }

  return icons
}
