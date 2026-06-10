import { describe, it, expect } from 'vitest'
import { createApp } from 'vue'
import DocsSection from './DocsSection.vue'
import '../../styles/main.css'
import type { DocsTreeNode } from '../../../../types/api-responses'

const skiRunTree: DocsTreeNode[] = [
  { name: 'map.png', slug: 'map.png', type: 'file', url: '/projects/ski-run-27/docs/map.png', id: '1' },
  {
    name: 'drafts',
    slug: 'drafts',
    type: 'folder',
    children: [
      { name: 'Ski Run 2027.pptx', slug: 'ski-run-2027.pptx', type: 'file', url: '/projects/ski-run-27/docs/drafts/ski-run-2027.pptx', id: '2' },
    ],
  },
]

describe('DocsSection', () => {
  it('renders root and nested file lozenges', () => {
    const root = document.createElement('div')
    const app = createApp(DocsSection, { nodes: skiRunTree, depth: 0, subsectionHeadings: true })
    app.mount(root)
    expect(root.querySelectorAll('.pdc-lozenge').length).toBe(2)
    expect(root.querySelectorAll('.pdc-grid').length).toBe(2)
    app.unmount()
  })
})
