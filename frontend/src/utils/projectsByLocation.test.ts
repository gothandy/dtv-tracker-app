import { describe, it, expect } from 'vitest'
import { projectsByLocationRows, NO_LOCATION } from './projectsByLocation'
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
const rows = projectsByLocationRows(projects, sessions, tree, '', ORIGIN, TODAY)
const locations = (r = rows) => [...new Set(r.map(x => x[0]))]
const under = (path: string, r = rows) => r.filter(x => x[0] === path).map(x => x[4])

describe('projectsByLocationRows', () => {
  it('goes by the second-level tags (trails), in order, then (No location)', () => {
    expect(locations()).toEqual(['XC:Freeminers', 'XC:Verderers', 'XC:Adit', 'DH:Corkscrew', NO_LOCATION])
  })

  it('has one row per project, and no summary rows', () => {
    expect(rows.filter(r => r[4] !== 'No projects')).toHaveLength(projects.length)
  })

  it('gives a trail with no projects one No projects row, with no link', () => {
    expect(rows.filter(r => r[0] === 'XC:Verderers')).toEqual([
      ['XC:Verderers', 'XC', 'Verderers', '', 'No projects', '', 0, 0, '', '', '', '', '', ''],
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
      'XC:Freeminers', 'XC', 'Freeminers', 'XC:Freeminers', 'Future', 'Active', 2, 5.5, 'No', 'Future', '2026-11-03', '2026-01-01', `${ORIGIN}/projects/future`, '',
    ])
  })

  it('says Yes for a project with documents, and gives its description', () => {
    const described = projects.map(p => p.id === 1 ? { ...p, description: 'Rebuild the berms' } : p)
    const withDocs = projectsByLocationRows(described, sessions, tree, '', ORIGIN, TODAY, new Set(['past']))
    const past = withDocs.find(r => r[4] === 'Past')!
    expect([past[8], past[13]]).toEqual(['Yes', 'Rebuild the berms'])
  })

  it('puts projects tagged only higher up, or not at all, under (No location)', () => {
    expect(under(NO_LOCATION)).toEqual(['Just DH', 'Untagged'])
    expect(rows.find(r => r[4] === 'Just DH')?.slice(0, 4)).toEqual([NO_LOCATION, '', '', 'DH'])
  })

  it('with a tag filter, only the locations beneath it', () => {
    const filtered = projectsByLocationRows(projects, sessions, tree, 'XC', ORIGIN, TODAY)
    expect(locations(filtered)).toEqual(['XC:Freeminers', 'XC:Verderers', 'XC:Adit', NO_LOCATION])
  })

  it('with a tag filter below a trail, just that trail', () => {
    const tnt = projects.filter(p => p.metadata.some(m => m.label === 'XC:Adit:TNT'))
    const filtered = projectsByLocationRows(tnt, sessions, tree, 'XC:Adit:TNT', ORIGIN, TODAY)
    expect(locations(filtered)).toEqual(['XC:Adit'])
    expect(under('XC:Adit', filtered)).toEqual(['TNT'])
  })

  it('with No tags, just the untagged projects', () => {
    const untagged = projects.filter(p => !p.metadata.length)
    const filtered = projectsByLocationRows(untagged, sessions, tree, NO_TAGS, ORIGIN, TODAY)
    expect(locations(filtered)).toEqual([NO_LOCATION])
    expect(under(NO_LOCATION, filtered)).toEqual(['Untagged'])
  })
})
