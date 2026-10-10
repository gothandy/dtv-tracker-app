import { describe, it, expect } from 'vitest'
import { buildLink } from './buildInfo'

const SHA = '7b6a7287e2b6dbbd4f4611d29446898be4364a75'

describe('buildLink', () => {
  it('links production builds to the commit', () => {
    expect(buildLink(SHA, '')).toEqual({
      label: '7b6a728',
      href: `https://github.com/gothandy/dtv-tracker-app/commit/${SHA}`,
    })
  })

  it('links preview builds to the pull request and names the PR commit', () => {
    expect(buildLink(SHA, '274')).toEqual({
      label: 'PR #274 · 7b6a728',
      href: 'https://github.com/gothandy/dtv-tracker-app/pull/274',
    })
  })

  it('returns null when the commit is unknown', () => {
    expect(buildLink('', '274')).toBeNull()
  })
})
