import { describe, it, expect } from 'vitest'
import {
  normalizeTaxonomyPath,
  taxonomyPathParts,
  resolveMetadataTags,
  expandMetadataToPills,
  type MetadataTag,
} from './taxonomyPath'
import type { TaxNode } from '../composables/useTaxonomy'

const tree: TaxNode[] = [
  {
    id: 'guid-dh',
    label: 'DH',
    children: [{ id: 'guid-cork', label: 'Corkscrew', children: [] }],
  },
]

describe('normalizeTaxonomyPath', () => {
  it('converts SharePoint separators to colon paths', () => {
    expect(normalizeTaxonomyPath('DH/Corkscrew')).toBe('DH:Corkscrew')
    expect(normalizeTaxonomyPath('DH > Corkscrew')).toBe('DH:Corkscrew')
  })
})

describe('expandMetadataToPills', () => {
  it('expands hierarchical tag into ancestor and leaf pills', () => {
    const tags: MetadataTag[] = [{ label: 'DH/Corkscrew', termGuid: 'guid-cork' }]
    const pills = expandMetadataToPills(tags, tree)
    expect(pills.map(p => p.shortLabel)).toEqual(['DH', 'Corkscrew'])
  })

  it('resolves leaf-only label via termGuid when tree is loaded', () => {
    const tags: MetadataTag[] = [{ label: 'Corkscrew', termGuid: 'guid-cork' }]
    const pills = expandMetadataToPills(tags, tree)
    expect(pills.map(p => p.shortLabel)).toEqual(['DH', 'Corkscrew'])
  })
})

describe('resolveMetadataTags', () => {
  it('fills full path from taxonomy tree', () => {
    const resolved = resolveMetadataTags([{ label: 'Corkscrew', termGuid: 'guid-cork' }], tree)
    expect(resolved[0].label).toBe('DH:Corkscrew')
  })
})

describe('taxonomyPathParts', () => {
  it('splits normalized paths', () => {
    expect(taxonomyPathParts('DH:Corkscrew')).toEqual(['DH', 'Corkscrew'])
  })
})
