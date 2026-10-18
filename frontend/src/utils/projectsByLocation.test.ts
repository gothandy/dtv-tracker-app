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
const locations = (r = rows) => r.filter(x => x[0] === 'Location')
const under = (path: string, r = rows) => r.filter(x => x[0] === 'Project' && x[1] === path).map(x => x[4])

describe('projectsByLocationRows', () => {
  it('lists the second-level tags (trails), in order, then (No location)', () => {
    expect(locations().map(r => r[1])).toEqual(['XC:Freeminers', 'XC:Verderers', 'XC:Adit', 'DH:Corkscrew', NO_LOCATION])
  })

  it('counts a project tagged deeper at its trail, showing its tag in full', () => {
    expect(under('XC:Adit')).toEqual(['Adit', 'TNT'])
    expect(rows.find(r => r[0] === 'Project' && r[4] === 'TNT')?.[3]).toBe('XC:Adit:TNT')
  })

  it('says No projects for a trail with none', () => {
    expect(locations().find(r => r[1] === 'XC:Verderers')?.[4]).toBe('No projects')
  })

  it('orders a location: no sessions, then future, then past', () => {
    expect(under('XC:Freeminers')).toEqual(['New', 'Future', 'Past'])
  })

  it('totals sessions and hours, and links to the filtered Projects page', () => {
    const fm = locations().find(r => r[1] === 'XC:Freeminers')!
    expect([fm[2], fm[3], fm[4], fm[6], fm[7], fm[11]]).toEqual(['XC', '', '3 projects', 3, 15.5, `${ORIGIN}/projects?tag=XC%3AFreeminers`])
  })

  it('gives each project its status, totals, timing, dates and link', () => {
    expect(rows.find(r => r[0] === 'Project' && r[4] === 'Future')).toEqual([
      'Project', 'XC:Freeminers', 'XC', 'XC:Freeminers', 'Future', 'Active', 2, 5.5, 'Future', '2026-11-03', '2026-01-01', `${ORIGIN}/projects/future`,
    ])
  })

  it('puts projects tagged only higher up, or not at all, under (No location)', () => {
    expect(under(NO_LOCATION)).toEqual(['Just DH', 'Untagged'])
  })

  it('with a tag filter, only the locations beneath it', () => {
    const filtered = projectsByLocationRows(projects, sessions, tree, 'XC', ORIGIN, TODAY)
    expect(locations(filtered).map(r => r[1])).toEqual(['XC:Freeminers', 'XC:Verderers', 'XC:Adit', NO_LOCATION])
  })

  it('with a tag filter below a trail, just that trail', () => {
    const tnt = projects.filter(p => p.metadata.some(m => m.label === 'XC:Adit:TNT'))
    const filtered = projectsByLocationRows(tnt, sessions, tree, 'XC:Adit:TNT', ORIGIN, TODAY)
    expect(locations(filtered).map(r => r[1])).toEqual(['XC:Adit'])
    expect(under('XC:Adit', filtered)).toEqual(['TNT'])
  })

  it('with No tags, just the untagged projects', () => {
    const untagged = projects.filter(p => !p.metadata.length)
    const filtered = projectsByLocationRows(untagged, sessions, tree, NO_TAGS, ORIGIN, TODAY)
    expect(locations(filtered).map(r => r[1])).toEqual([NO_LOCATION])
    expect(under(NO_LOCATION, filtered)).toEqual(['Untagged'])
  })
})
