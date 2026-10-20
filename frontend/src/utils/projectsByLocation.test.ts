import { describe, it, expect } from 'vitest'
import { projectsByLocation, projectsByLocationRows, trailsWithoutProjects, trailName, csvDescription, DESCRIPTION_MAX, NO_LOCATION } from './projectsByLocation'
import { NO_TAGS } from './tagFilter'
import type { Session } from '../types/session'

const TODAY = '2026-10-18'
const ORIGIN = 'https://tracker.dtv.org.uk'
const tree = [
  { label: 'XC', id: '1', children: [
    { label: 'Freeminers', id: '2' },
    { label: 'Verderers', id: '3' },
    { label: 'Adit', id: '6', children: [{ label: 'TNT', id: '7' }] },
  ] },
  { label: 'DH', id: '4', children: [{ label: 'Corkscrew', id: '5' }] },
]
const s = (projectId: number, date: string) => ({ projectId, date }) as unknown as Session
const project = (id: number, name: string, tags: string[], sessionCount = 0, hours = 0, status?: string) =>
  ({ id, key: name.toLowerCase().replace(/ /g, '-'), displayName: name, status, metadata: tags.map(label => ({ label })), sessionCount, hours })

const projects = [
  project(1, 'Past', ['XC:Freeminers'], 1, 10),
  project(2, 'Future', ['XC:Freeminers'], 2, 5.5, 'Active'),
  project(3, 'New', ['XC:Freeminers']),
  project(4, 'Just DH', ['DH']),
  project(5, 'Untagged', []),
  project(6, 'Adit', ['XC:Adit']),
  project(7, 'TNT', ['XC:Adit:TNT']),
]
const sessions = [s(1, '2026-01-10'), s(2, '2026-01-01'), s(2, '2026-11-03')]
const rows = projectsByLocationRows(projects, sessions, tree, trailsWithoutProjects(projects, tree, ''), ORIGIN, TODAY)
const locations = (r = rows) => [...new Set(r.map(x => x[0]))]
const under = (path: string, r = rows) => r.filter(x => x[0] === path).map(x => x[4])

describe('projectsByLocationRows', () => {
  it('goes by the second-level tags (trails), in order, then (No location)', () => {
    expect(locations()).toEqual(['XC:Freeminers', 'XC:Verderers', 'XC:Adit', 'DH:Corkscrew', NO_LOCATION])
  })

  it('has one row per project, and no summary rows', () => {
    expect(rows.filter(r => r[4] !== 'No matches')).toHaveLength(projects.length)
  })

  it('gives a trail with no projects one No matches row, with no link', () => {
    expect(rows.filter(r => r[0] === 'XC:Verderers')).toEqual([
      ['XC:Verderers', 'XC', 'Verderers', '', 'No matches', '', '', '', '', '', '', '', '', '', ''],
    ])
  })

  it('counts a project tagged deeper at its trail, showing its tag in full', () => {
    expect(under('XC:Adit')).toEqual(['Adit', 'TNT'])
    expect(rows.find(r => r[4] === 'TNT')?.slice(0, 4)).toEqual(['XC:Adit', 'XC', 'Adit', 'XC:Adit:TNT'])
  })

  it('orders a location: no sessions, then future, then past', () => {
    expect(under('XC:Freeminers')).toEqual(['New', 'Future', 'Past'])
  })

  it('gives each project its location, trail, tag, status, totals, documents, timing, dates, link and description', () => {
    expect(rows.find(r => r[4] === 'Future')).toEqual([
      'XC:Freeminers', 'XC', 'Freeminers', 'XC:Freeminers', 'Future', 'Active', 2, 5.5, 'No', 'Future', '2026-01-01', '2026-11-03', '2026-01-01', `${ORIGIN}/projects/future`, '',
    ])
  })

  it('says Yes for a project with documents, and gives its description', () => {
    const described = projects.map(p => p.id === 1 ? { ...p, description: 'Rebuild the berms' } : p)
    const withDocs = projectsByLocationRows(described, sessions, tree, [], ORIGIN, TODAY, new Set(['past']))
    const past = withDocs.find(r => r[4] === 'Past')!
    expect([past[8], past[14]]).toEqual(['Yes', 'Rebuild the berms'])
  })

  it('gives the first session date whether it is past or still to come', () => {
    const past = rows.find(r => r[4] === 'Past')!
    expect(past.slice(9, 13)).toEqual(['Past', '2026-01-10', '', '2026-01-10'])
    expect(rows.find(r => r[4] === 'New')!.slice(9, 13)).toEqual(['None', '', '', ''])
  })

  it('puts projects tagged only higher up, or not at all, under (No location)', () => {
    expect(under(NO_LOCATION)).toEqual(['Just DH', 'Untagged'])
    expect(rows.find(r => r[4] === 'Just DH')?.slice(0, 4)).toEqual([NO_LOCATION, '', '', 'DH'])
  })

  it('without empty trails (Hide No projects), only locations that have projects', () => {
    const hidden = projectsByLocationRows(projects, sessions, tree, [], ORIGIN, TODAY)
    expect(locations(hidden)).toEqual(['XC:Freeminers', 'XC:Adit', NO_LOCATION])
  })

  it('lists only the projects it is given (the selection), with the empty trails it is given', () => {
    const picked = projects.filter(p => p.displayName === 'TNT')
    const r = projectsByLocationRows(picked, sessions, tree, ['DH:Corkscrew'], ORIGIN, TODAY)
    expect(r.map(x => [x[0], x[4]])).toEqual([['XC:Adit', 'TNT'], ['DH:Corkscrew', 'No matches']])
  })
})

describe('csvDescription', () => {
  it('puts the description on one line', () => {
    expect(csvDescription('Rebuild the berms.\r\n\r\n  Then the drops.\nDone')).toBe('Rebuild the berms. Then the drops. Done')
  })

  it('keeps a short one as it is, and gives nothing for none', () => {
    expect(csvDescription('x'.repeat(DESCRIPTION_MAX))).toBe('x'.repeat(DESCRIPTION_MAX))
    expect(csvDescription(undefined)).toBe('')
  })

  it('cuts a long one to the limit, ending " ..."', () => {
    const cut = csvDescription('word '.repeat(40))
    expect(cut.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(cut.endsWith(' ...')).toBe(true)
  })
})

describe('trailsWithoutProjects', () => {
  it('gives the trails with none of the projects, in order', () => {
    expect(trailsWithoutProjects(projects, tree, '')).toEqual(['XC:Verderers', 'DH:Corkscrew'])
  })

  it('with a tag filter, only the trails beneath it', () => {
    expect(trailsWithoutProjects(projects, tree, 'DH')).toEqual(['DH:Corkscrew'])
  })

  it('with a tag filter below a trail, that trail if it has none', () => {
    expect(trailsWithoutProjects([], tree, 'XC:Adit:TNT')).toEqual(['XC:Adit'])
    expect(trailsWithoutProjects(projects, tree, 'XC:Adit:TNT')).toEqual([])
  })

  it('with No tags, none', () => {
    expect(trailsWithoutProjects([], tree, NO_TAGS)).toEqual([])
  })
})

describe('trailName', () => {
  it('gives the trail from a tag at or below it', () => {
    expect(trailName([{ label: 'XC:Adit:TNT' }])).toBe('Adit')
    expect(trailName([{ label: 'DH:Corkscrew' }])).toBe('Corkscrew')
  })

  it('gives nothing for a top-level tag or none', () => {
    expect(trailName([{ label: 'DH' }])).toBe('')
    expect(trailName(undefined)).toBe('')
  })
})

describe('projectsByLocation', () => {
  it('groups by trail in the term set order, empty trails in place, (No location) last', () => {
    const groups = projectsByLocation(projects, sessions, tree, ['XC:Verderers', 'DH:Corkscrew'], TODAY)
    expect(groups.map(g => [g.top, g.path, g.projects.map(p => p.displayName)])).toEqual([
      ['XC', 'XC:Freeminers', ['New', 'Future', 'Past']],
      ['XC', 'XC:Verderers', []],
      ['XC', 'XC:Adit', ['Adit', 'TNT']],
      ['DH', 'DH:Corkscrew', []],
      ['', NO_LOCATION, ['Just DH', 'Untagged']],
    ])
  })
})
