import { describe, it, expect } from 'vitest'
import { createApp } from 'vue'
import ProjectDocsCard from './ProjectDocsCard.vue'
import '../../styles/main.css'
import type { DocsTreeNode } from '../../../../types/api-responses'

const tree: DocsTreeNode[] = [
  { name: 'map.png', slug: 'map.png', type: 'file', url: '/projects/ski-run-27/docs/map.png', id: '1' },
  {
    name: 'sketches',
    slug: 'sketches',
    type: 'folder',
    children: [
      { name: 'sr01.png', slug: 'sr01.png', type: 'file', url: '/projects/ski-run-27/docs/sketches/sr01.png', id: '2' },
    ],
  },
]

describe('ProjectDocsCard', () => {
  it('renders file lozenges when tree has files', () => {
    const grid = document.createElement('div')
    grid.style.display = 'grid'
    grid.style.gridTemplateColumns = '1fr 2fr'
    grid.style.alignItems = 'start'
    const left = document.createElement('div')
    left.style.height = '120px'
    left.textContent = 'Totals'
    const right = document.createElement('div')
    right.className = 'min-w-0 self-stretch'
    grid.append(left, right)

    const app = createApp(ProjectDocsCard, {
      tree,
      projectKey: 'ski-run-27',
      loading: false,
      allowManage: true,
    })
    app.mount(right)

    expect(right.querySelectorAll('.pdc-lozenge').length).toBe(2)
    app.unmount()
  })
})
