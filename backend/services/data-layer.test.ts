import { describe, it, expect } from 'vitest'
import { calculateFinancialYear, calculateCurrentFY, calculateSessionStats, toMatchName, extractMetadataTags, findTitleKeyClash, sessionScheduleFields, formatSessionTimeRangeProse, deriveMediaStatus, mediaStatsFromFolderItems } from './data-layer'
import { SESSION_TIME, SESSION_LENGTH } from './field-names'
import type { SharePointEntry } from '../../types/sharepoint'
import type { SharePointSession } from '../../types/session'

describe('findTitleKeyClash', () => {
  const items = [
    { ID: 1, Title: 'alpha' },
    { ID: 2, Title: 'Beta' },
  ]

  it('finds another item with the same key (case-insensitive)', () => {
    expect(findTitleKeyClash(items, 'beta')?.ID).toBe(2)
    expect(findTitleKeyClash(items, 'ALPHA')?.ID).toBe(1)
  })

  it('excludes the given ID (rename to self / case change)', () => {
    expect(findTitleKeyClash(items, 'alpha', 1)).toBeUndefined()
    expect(findTitleKeyClash(items, 'ALPHA', 1)).toBeUndefined()
  })

  it('returns undefined when no clash', () => {
    expect(findTitleKeyClash(items, 'gamma')).toBeUndefined()
  })
})

describe('toMatchName', () => {
  it('returns empty string for undefined',        () => expect(toMatchName(undefined)).toBe(''))
  it('returns empty string for empty string',     () => expect(toMatchName('')).toBe(''))
  it('lowercases',                                () => expect(toMatchName('JOHN SMITH')).toBe('john smith'))
  it('preserves hyphens',                         () => expect(toMatchName('Smith-Jones')).toBe('smith-jones'))
  it('replaces apostrophes with space',           () => expect(toMatchName("O'Brien")).toBe('o brien'))
  it('collapses multiple spaces',                 () => expect(toMatchName('John  Smith')).toBe('john smith'))
  it('trims leading and trailing whitespace',     () => expect(toMatchName('  John Smith  ')).toBe('john smith'))
  it('collapses mixed punctuation to one space',  () => expect(toMatchName('Dr. J. Smith')).toBe('dr j smith'))
  it('preserves digits',                          () => expect(toMatchName('Team2')).toBe('team2'))
  it('normalises accented characters via NFD',    () => expect(toMatchName('René')).toBe('rené'.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()))
  it('René and Rene normalise to the same key',   () => expect(toMatchName('René')).toBe(toMatchName('Rene')))
  it('Renée and Renee normalise to the same key', () => expect(toMatchName('Renée')).toBe(toMatchName('Renee')))
})

describe('calculateFinancialYear', () => {
  it('Apr 1 is in FY of that year',   () => expect(calculateFinancialYear(new Date('2025-04-01'))).toBe(2025))
  it('Dec 15 is in FY of that year',  () => expect(calculateFinancialYear(new Date('2024-12-15'))).toBe(2024))
  it('Mar 31 is in previous FY',      () => expect(calculateFinancialYear(new Date('2025-03-31'))).toBe(2024))
  it('Jan 1 is in previous FY',       () => expect(calculateFinancialYear(new Date('2025-01-01'))).toBe(2024))
  it('Apr 1 boundary (FY2024)',       () => expect(calculateFinancialYear(new Date('2024-04-01'))).toBe(2024))
  it('Mar 31 boundary (FY2023)',      () => expect(calculateFinancialYear(new Date('2024-03-31'))).toBe(2023))
})

describe('calculateCurrentFY', () => {
  it('returns consistent shape', () => {
    const fy = calculateCurrentFY()
    expect(typeof fy.startYear).toBe('number')
    expect(fy.endYear).toBe(fy.startYear + 1)
    expect(fy.key).toBe(`FY${fy.startYear}`)
  })

  it('startYear matches calculateFinancialYear(today)', () => {
    const fy = calculateCurrentFY()
    expect(fy.startYear).toBe(calculateFinancialYear(new Date()))
  })
})

// ---- minimal entry fixture for calculateSessionStats ----

// SESSION_LOOKUP = 'SessionLookupId' — value type matches what calculateSessionStats uses as map key
function entry(sessionId: string, overrides: Partial<SharePointEntry> = {}): SharePointEntry {
  return { ID: 1, Created: '', Modified: '', SessionLookupId: sessionId, Hours: 0, ...overrides }
}

describe('extractMetadataTags', () => {
  it('normalises slash-separated SharePoint paths to colon paths', () => {
    const tags = extractMetadataTags({ Label: 'DH/Corkscrew', TermGuid: 'abc-123' })
    expect(tags).toEqual([{ label: 'DH:Corkscrew', termGuid: 'abc-123' }])
  })

  it('normalises greater-than-separated SharePoint paths to colon paths', () => {
    const tags = extractMetadataTags({ Label: 'DH > Corkscrew', TermGuid: 'abc-123' })
    expect(tags).toEqual([{ label: 'DH:Corkscrew', termGuid: 'abc-123' }])
  })
})

describe('calculateSessionStats', () => {
  it('returns empty map for empty entries array', () => {
    expect(calculateSessionStats([]).size).toBe(0)
  })

  it('counts registrations for a session', () => {
    const stats = calculateSessionStats([entry('1'), entry('1'), entry('1')])
    expect(stats.get('1')?.registrations).toBe(3)
  })

  it('sums hours across entries', () => {
    const stats = calculateSessionStats([entry('1', { Hours: 3 }), entry('1', { Hours: 1.5 })])
    expect(stats.get('1')?.hours).toBeCloseTo(4.5)
  })

  it('excludes cancelled entries from all counts', () => {
    const stats = calculateSessionStats([
      entry('1', { Hours: 3 }),
      entry('1', { Hours: 2, Cancelled: '2024-06-01T10:00:00Z' }),
    ])
    expect(stats.get('1')?.registrations).toBe(1)
    expect(stats.get('1')?.hours).toBeCloseTo(3)
  })

  it('counts newCount from profileFirstSessionMap', () => {
    const profileFirstSessionMap = new Map([[42, 1]])
    const stats = calculateSessionStats(
      [entry('1', { ProfileLookupId: '42' }), entry('1', { ProfileLookupId: '99' })],
      profileFirstSessionMap
    )
    expect(stats.get('1')?.newCount).toBe(1)
  })

  it('does not count newCount when entry has Regular label', () => {
    const profileFirstSessionMap = new Map([[42, 1]])
    const stats = calculateSessionStats(
      [entry('1', { ProfileLookupId: '42', Labels: ['Regular'] })],
      profileFirstSessionMap
    )
    expect(stats.get('1')?.newCount).toBe(0)
    expect(stats.get('1')?.regularCount).toBe(1)
  })

  it('counts regularCount from Labels', () => {
    const stats = calculateSessionStats([entry('1', { Labels: ['Regular'] })])
    expect(stats.get('1')?.regularCount).toBe(1)
  })

  it('counts childCount from AccompanyingAdultLookupId', () => {
    const stats = calculateSessionStats([entry('1', { AccompanyingAdultLookupId: 7 })])
    expect(stats.get('1')?.childCount).toBe(1)
  })

  it('counts eventbriteCount from EventbriteAttendeeID', () => {
    const stats = calculateSessionStats([entry('1', { EventbriteAttendeeID: '12345' })])
    expect(stats.get('1')?.eventbriteCount).toBe(1)
  })

  it('weights registrations and newCount by entry Count (headcount)', () => {
    const profileFirstSessionMap = new Map([[10, 1]])
    const stats = calculateSessionStats(
      [
        entry('1', { ProfileLookupId: '10', Count: 5 }),
        entry('1', { ProfileLookupId: '11' }),
      ],
      profileFirstSessionMap
    )
    expect(stats.get('1')?.registrations).toBe(6)
    expect(stats.get('1')?.newCount).toBe(5)
  })

  it('weights childCount, regularCount, eventbriteCount by entry Count', () => {
    const stats = calculateSessionStats([
      entry('1', { Labels: ['Regular'], Count: 3 }),
      entry('1', { AccompanyingAdultLookupId: 9, Count: 2 }),
      entry('1', { EventbriteAttendeeID: 'eb', Count: 4 }),
    ])
    expect(stats.get('1')?.regularCount).toBe(3)
    expect(stats.get('1')?.childCount).toBe(2)
    expect(stats.get('1')?.eventbriteCount).toBe(4)
    expect(stats.get('1')?.registrations).toBe(9)
  })

  it('handles multiple sessions independently', () => {
    const stats = calculateSessionStats([entry('1'), entry('1'), entry('2')])
    expect(stats.get('1')?.registrations).toBe(2)
    expect(stats.get('2')?.registrations).toBe(1)
  })

  it('ignores entries with no SessionLookupId', () => {
    const stats = calculateSessionStats([{ ID: 1, Created: '', Modified: '', Hours: 3 } as SharePointEntry])
    expect(stats.size).toBe(0)
  })
})

describe('formatSessionTimeRangeProse', () => {
  it('formats default schedule in email prose', () => {
    expect(formatSessionTimeRangeProse('09:30', 3)).toBe('9:30 to 12:30 (about 3 hours)')
  })

  it('supports fractional hours and singular hour', () => {
    expect(formatSessionTimeRangeProse('10:00', 2.5)).toBe('10:00 to 12:30 (about 2.5 hours)')
    expect(formatSessionTimeRangeProse('09:00', 1)).toBe('9:00 to 10:00 (about 1 hour)')
  })

  it('rounds fractional-minute end times from floating-point arithmetic', () => {
    expect(formatSessionTimeRangeProse('09:30', 2.33)).toBe('9:30 to 11:50 (about 2.33 hours)')
  })
})

describe('sessionScheduleFields', () => {
  it('uses SharePoint Time and Length when set', () => {
    expect(sessionScheduleFields({
      ID: 1,
      Date: '2026-06-12',
      Created: '',
      Modified: '',
      [SESSION_TIME]: '10:00',
      [SESSION_LENGTH]: 2.5,
    } as SharePointSession)).toEqual({ time: '10:00', length: 2.5 })
  })

  it('defaults to 09:30 and 3 hours when SharePoint fields are unset', () => {
    expect(sessionScheduleFields({
      ID: 1,
      Date: '2026-06-12',
      Created: '',
      Modified: '',
    } as SharePointSession)).toEqual({
      time: '09:30',
      length: 3,
    })
  })
})

describe('deriveMediaStatus', () => {
  it('returns none when folder is empty', () => {
    expect(deriveMediaStatus(0, 0, null, false)).toBe('none')
  })

  it('returns allPrivate when files exist but none are public', () => {
    expect(deriveMediaStatus(3, 0, 42, false)).toBe('allPrivate')
  })

  it('returns public when cover is set and public', () => {
    expect(deriveMediaStatus(2, 1, 10, true)).toBe('public')
  })

  it('returns noCover only when public files exist and no cover is selected', () => {
    expect(deriveMediaStatus(2, 1, null, false)).toBe('noCover')
    expect(deriveMediaStatus(0, 0, null, false)).toBe('none')
  })

  it('returns coverPrivate when public files exist but cover is set and not public', () => {
    expect(deriveMediaStatus(2, 1, 10, false)).toBe('coverPrivate')
  })
})

describe('mediaStatsFromFolderItems', () => {
  const items = [
    { listItemId: 1, isPublic: false, mimeType: 'image/jpeg' },
    { listItemId: 2, isPublic: true, mimeType: 'image/jpeg' },
  ]

  it('classifies from folder items and cover lookup', () => {
    expect(mediaStatsFromFolderItems(items, 2)).toEqual({ media: 2, mediaStatus: 'public' })
    expect(mediaStatsFromFolderItems(items, null)).toEqual({ media: 2, mediaStatus: 'noCover' })
    expect(mediaStatsFromFolderItems(items, 1)).toEqual({ media: 2, mediaStatus: 'coverPrivate' })
  })

  it('counts videos in media but not in mediaStatus (cover is photo-only)', () => {
    const videoOnly = [{ listItemId: 9, isPublic: true, mimeType: 'video/mp4' }]
    expect(mediaStatsFromFolderItems(videoOnly, null)).toEqual({ media: 0, mediaStatus: 'none' })

    const mixed = [
      { listItemId: 1, isPublic: true, mimeType: 'video/mp4' },
      { listItemId: 2, isPublic: true, mimeType: 'image/jpeg' },
    ]
    expect(mediaStatsFromFolderItems(mixed, null)).toEqual({ media: 1, mediaStatus: 'noCover' })
  })
})
