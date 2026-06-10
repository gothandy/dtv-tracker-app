import type { DocsTreeNode } from '../../../types/api-responses'

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
