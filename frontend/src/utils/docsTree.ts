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

/** Resolve a folder node from slug path segments; returns null if any segment is missing or not a folder. */
export function findDocsFolderByPath(tree: DocsTreeNode[], segments: string[]): DocsTreeNode | null {
  if (!segments.length) return null
  let nodes = tree
  let found: DocsTreeNode | null = null
  for (const segment of segments) {
    const node = nodes.find(n => n.slug === segment && n.type === 'folder')
    if (!node) return null
    found = node
    nodes = node.children ?? []
  }
  return found
}

/** Breadcrumb entries from root to the folder at `segments` (inclusive). */
export function docsFolderBreadcrumb(tree: DocsTreeNode[], segments: string[]): DocsTreeNode[] {
  const trail: DocsTreeNode[] = []
  let nodes = tree
  for (const segment of segments) {
    const node = nodes.find(n => n.slug === segment && n.type === 'folder')
    if (!node) break
    trail.push(node)
    nodes = node.children ?? []
  }
  return trail
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
