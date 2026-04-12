// Ported from public/js/tag-icons.js

export interface TagIcon {
  icon: string
  alt: string
  type: 'badge' | 'tag'
  tag?: string        // hashtag to match in entry.notes, e.g. '#New'
  color?: string      // css modifier: 'orange' | 'red' | 'dark-green'
}

export const TAG_ICONS: TagIcon[] = [
  // Badges (profile-level indicators)
  { icon: 'badges/member.svg',  alt: 'Charity Member',    type: 'badge' },
  { icon: 'badges/card.svg',    alt: 'Benefits Card',      type: 'badge' },
  { icon: 'badges/card.svg',    alt: 'Card In Container',  type: 'badge', color: 'orange' },
  { icon: 'badges/group.svg',   alt: 'Group / Company',    type: 'badge' },

  // Entry tags (matched from notes)
  { icon: 'badges/child.svg',      alt: 'Child',            tag: '#Child',      type: 'tag' },
  { icon: 'badges/regular.svg',    alt: 'Regular',          tag: '#Regular',    type: 'tag' },
  { icon: 'badges/new.svg',        alt: 'New',              tag: '#New',        type: 'tag' },
  { icon: 'badges/diglead.svg',    alt: 'Dig Lead',         tag: '#DigLead',    type: 'tag' },
  { icon: 'badges/firstaider.svg', alt: 'First Aider',      tag: '#FirstAider', type: 'tag', color: 'green' },
  { icon: 'badges/csr.svg',        alt: 'CSR',              tag: '#CSR',        type: 'tag' },
  { icon: 'badges/late.svg',       alt: 'Late',             tag: '#Late',       type: 'tag' },
  { icon: 'badges/nophoto.svg',    alt: 'No Photo',         tag: '#NoPhoto',    type: 'tag', color: 'red' },
  { icon: 'brands/eventbrite.svg', alt: 'Eventbrite',       tag: '#Eventbrite', type: 'tag' },
  { icon: 'status/warning.svg',    alt: 'Duplicate Warning',tag: '#Duplicate',  type: 'tag', color: 'red' },
]

/** Returns tag icons matched from an entry's notes string */
export function iconsFromNotes(notes: string | undefined): TagIcon[] {
  if (!notes) return []
  return TAG_ICONS.filter(t =>
    t.tag && new RegExp(t.tag.replace('#', '#'), 'i').test(notes)
  )
}

interface EntryIconSource {
  isMember?: boolean
  isGroup?: boolean
  cardStatus?: string
  notes?: string
}

/** Builds the full icon list for an entry: profile badges + notes tags */
export function iconsForEntry(e: EntryIconSource): TagIcon[] {
  const icons: TagIcon[] = []
  if (e.isMember && !e.isGroup) icons.push({ icon: 'badges/member.svg', alt: 'Charity Member', type: 'badge' })
  if (e.cardStatus === 'Accepted')  icons.push({ icon: 'badges/card.svg', alt: 'Benefits Card', type: 'badge' })
  if (e.cardStatus === 'Invited')   icons.push({ icon: 'badges/card.svg', alt: 'Card Invited', type: 'badge', color: 'orange' })
  if (e.isGroup) icons.push({ icon: 'badges/group.svg', alt: 'Group / Company', type: 'badge' })
  return [...icons, ...iconsFromNotes(e.notes)]
}
