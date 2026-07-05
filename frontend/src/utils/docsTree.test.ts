import { describe, it, expect } from 'vitest'
import { docsTreeHasFiles, removeDocFromTree, findDocsFolderByPath, docsFolderBreadcrumb, partitionDocsNodes } from './docsTree'
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

describe('findDocsFolderByPath', () => {
  it('returns folder node for valid path', () => {
    const folder = findDocsFolderByPath(sampleTree, ['reports'])
    expect(folder?.name).toBe('Reports')
  })

  it('returns null for missing or file paths', () => {
    expect(findDocsFolderByPath(sampleTree, ['missing'])).toBeNull()
    expect(findDocsFolderByPath(sampleTree, ['overview.pdf'])).toBeNull()
  })
})

describe('docsFolderBreadcrumb', () => {
  it('returns trail of folder nodes', () => {
    const trail = docsFolderBreadcrumb(sampleTree, ['reports'])
    expect(trail).toHaveLength(1)
    expect(trail[0].name).toBe('Reports')
  })
})

describe('partitionDocsNodes', () => {
  it('splits folders and files', () => {
    const { folders, files } = partitionDocsNodes(sampleTree)
    expect(folders).toHaveLength(1)
    expect(files).toHaveLength(1)
  })
})
