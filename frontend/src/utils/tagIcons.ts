import type { EntryStats, EntryStatsManual, EntryStatsSnapshot } from '../../../types/entry-stats'

export interface TagIcon {
  icon: string
  alt: string
  type: 'badge' | 'tag'
  color?: string
  subdued?: boolean
  activeLabel?: string              // alt text suffix when manually active, e.g. "On Duty"
  availableLabel?: string           // alt text suffix when snapshot-qualified but not manual, e.g. "Available"
  snapshotKey?: keyof EntryStatsSnapshot  // snapshot field for the available/qualified state
  manualKey?: keyof EntryStatsManual      // manual field this picker button toggles
}

export const TAG_ICONS: TagIcon[] = [
  // Badges (profile-level indicators)
  { icon: 'badges/member.svg',  alt: 'Charity Member',    type: 'badge' },
  { icon: 'badges/card.svg',    alt: 'Benefits Card',      type: 'badge' },
  { icon: 'badges/card.svg',    alt: 'Card In Container',  type: 'badge', color: 'orange' },
  { icon: 'badges/group.svg',   alt: 'Group / Company',    type: 'badge' },

  // Entry tags — displayed from stats; editable ones also appear in the picker
  { icon: 'badges/child.svg',      alt: 'Child',            type: 'tag' },
  { icon: 'badges/diglead.svg',    alt: 'Dig Lead',         type: 'tag', manualKey: 'digLead',    snapshotKey: 'isDigLead' },
  { icon: 'badges/firstaider.svg', alt: 'First Aider',      type: 'tag', color: 'green', manualKey: 'firstAider', snapshotKey: 'isFirstAider', activeLabel: 'On Duty', availableLabel: 'Available' },
  { icon: 'badges/csr.svg',        alt: 'CSR',              type: 'tag', manualKey: 'csr' },
  { icon: 'badges/late.svg',       alt: 'Late',             type: 'tag', manualKey: 'late' },
  { icon: 'brands/eventbrite.svg', alt: 'Eventbrite',       type: 'tag', manualKey: 'eventbrite' },
  { icon: 'badges/regular.svg',    alt: 'Regular',          type: 'tag' },
  { icon: 'badges/new.svg',        alt: 'New',              type: 'tag' },
  { icon: 'badges/nophoto.svg',    alt: 'No Photo',         type: 'tag', color: 'red' },
  { icon: 'status/warning.svg',    alt: 'Duplicate Warning',type: 'tag', color: 'red' },
]

/** Tags shown in the entry icon picker (manual/operational only) */
export const EDITABLE_TAG_ICONS = TAG_ICONS.filter(t => t.manualKey !== undefined)

/** Tags that have both a snapshot (available/qualified) and manual (active) state */
const DUAL_STATE_TAGS = EDITABLE_TAG_ICONS.filter(t => t.snapshotKey !== undefined)

interface EntryIconSource {
  isMember?: boolean
  isGroup?: boolean
  cardStatus?: string
  stats?: EntryStats
}

/** Builds the full icon list for an entry: profile badges + stats snapshot + stats manual */
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
    if (snapshot?.booking === 'New')     icons.push({ icon: 'badges/new.svg',      alt: 'New',              type: 'tag' })
    if (snapshot?.booking === 'Regular') icons.push({ icon: 'badges/regular.svg',  alt: 'Regular',          type: 'tag' })
    if (snapshot?.isChild)               icons.push({ icon: 'badges/child.svg',     alt: 'Child',            type: 'tag' })
    if (manual?.duplicate)               icons.push({ icon: 'status/warning.svg',   alt: 'Duplicate Warning',type: 'tag', color: 'red' })
    if (snapshot?.noPhoto)               icons.push({ icon: 'badges/nophoto.svg',   alt: 'No Photo',         type: 'tag', color: 'red' })
    if (snapshot?.noConsent)             icons.push({ icon: 'badges/noconsent.svg', alt: 'No Consent',       type: 'tag', color: 'red' })

    // Dual-state tags: snapshot = available/qualified, manual = active on the day
    for (const tag of DUAL_STATE_TAGS) {
      const isActive    = !!manual?.[tag.manualKey!]
      const isAvailable = !!snapshot?.[tag.snapshotKey!] && !isActive
      if (isActive) {
        const alt = tag.activeLabel ? `${tag.alt} (${tag.activeLabel})` : tag.alt
        icons.push({ ...tag, alt })
      } else if (isAvailable) {
        const alt = tag.availableLabel ? `${tag.alt} (${tag.availableLabel})` : tag.alt
        icons.push({ ...tag, alt, subdued: true })
      }
    }

    // Manual-only tags
    if (manual?.csr)        icons.push({ icon: 'badges/csr.svg',        alt: 'CSR',        type: 'tag' })
    if (manual?.late)       icons.push({ icon: 'badges/late.svg',        alt: 'Late',       type: 'tag' })
    if (manual?.eventbrite) icons.push({ icon: 'brands/eventbrite.svg', alt: 'Eventbrite', type: 'tag' })
  }

  return icons
}
