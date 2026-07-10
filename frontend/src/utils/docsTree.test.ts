import { describe, it, expect } from 'vitest'
import { docsTreeHasFiles, removeDocFromTree, findTopLevelFolder, partitionDocsNodes } from './docsTree'
import type { DocsTreeNode } from '../../../types/api-responses'

const sampleTree: DocsTreeNode[] = [
  {
    name: 'Reports',
    slug: 'reports',
    type: 'folder',
    children: [
      { name: 'Annual.pdf', slug: 'annual.pdf', type: 'file', url: '/projects/foo/docs/reports/annual.pdf', id: 'a1' },
    ],
  },
  { name: 'Overview.pdf', slug: 'overview.pdf', type: 'file', url: '/projects/foo/docs/overview.pdf', id: 'a2' },
]

describe('docsTreeHasFiles', () => {
  it('returns true when tree contains files', () => {
    expect(docsTreeHasFiles(sampleTree)).toBe(true)
  })

  it('returns false for empty or folder-only trees', () => {
    expect(docsTreeHasFiles([])).toBe(false)
    expect(docsTreeHasFiles([{ name: 'Empty', slug: 'empty', type: 'folder', children: [] }])).toBe(false)
  })
})

describe('removeDocFromTree', () => {
  it('removes a file node by id', () => {
    const result = removeDocFromTree(sampleTree, 'a1')
    expect(docsTreeHasFiles(result)).toBe(true)
    expect(result[0].children).toHaveLength(0)
  })
})

describe('findTopLevelFolder', () => {
  it('returns a root folder by slug', () => {
    expect(findTopLevelFolder(sampleTree, 'reports')?.name).toBe('Reports')
  })

  it('returns null for missing slug or nested-only slug', () => {
    expect(findTopLevelFolder(sampleTree, 'missing')).toBeNull()
    expect(findTopLevelFolder(sampleTree, 'overview.pdf')).toBeNull()
  })
})

describe('partitionDocsNodes', () => {
  it('splits folders and files', () => {
    const { folders, files } = partitionDocsNodes(sampleTree)
    expect(folders).toHaveLength(1)
    expect(files).toHaveLength(1)
  })
})
