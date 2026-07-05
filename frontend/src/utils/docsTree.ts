import type { DocsTreeNode } from '../../../types/api-responses'

export function sortDocsNodes(nodes: DocsTreeNode[]): DocsTreeNode[] {
  return [...nodes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export function partitionDocsNodes(nodes: DocsTreeNode[]): { folders: DocsTreeNode[]; files: DocsTreeNode[] } {
  return {
    folders: sortDocsNodes(nodes.filter(n => n.type === 'folder')),
    files: sortDocsNodes(nodes.filter(n => n.type === 'file' && n.url)),
  }
}

/** Top-level folder matching the first path segment. */
export function findTopLevelFolder(tree: DocsTreeNode[], slug: string): DocsTreeNode | null {
  const node = tree.find(n => n.slug === slug && n.type === 'folder')
  return node ?? null
}

export function docsTreeHasFiles(nodes: DocsTreeNode[]): boolean {
  for (const node of nodes) {
    if (node.type === 'file') return true
    if (node.children?.length && docsTreeHasFiles(node.children)) return true
  }
  return false
}

export function removeDocFromTree(nodes: DocsTreeNode[], itemId: string): DocsTreeNode[] {
  return nodes
    .filter(n => !(n.type === 'file' && n.id === itemId))
    .map(n => {
      if (n.type !== 'folder' || !n.children?.length) return n
      return { ...n, children: removeDocFromTree(n.children, itemId) }
    })
}
