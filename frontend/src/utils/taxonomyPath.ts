import type { TaxNode } from '../composables/useTaxonomy'

export type MetadataTag = { label: string; termGuid: string }

export interface MetadataTagPill {
  shortLabel: string
  pathKey: string
  depth: number
  termGuid: string | null
}

/** Canonical app path uses `:`; SharePoint may return `DH > Corkscrew` or `DH/Corkscrew`. */
export function normalizeTaxonomyPath(label: string): string {
  return label
    .replace(/\s*>\s*/g, ':')
    .replace(/\//g, ':')
    .replace(/:+/g, ':')
    .replace(/^:|:$/g, '')
    .trim()
}

export function taxonomyPathParts(label: string): string[] {
  return normalizeTaxonomyPath(label).split(':').filter(Boolean)
}

/** Colon path (DH:Corkscrew) → term GUID from taxonomy tree. */
export function buildTermGuidToPathMap(nodes: TaxNode[], prefix = ''): Map<string, string> {
  const map = new Map<string, string>()
  for (const node of nodes) {
    const path = prefix ? `${prefix}:${node.label}` : node.label
    map.set(node.id, path)
    if (node.children?.length) {
      for (const [id, p] of buildTermGuidToPathMap(node.children, path)) {
        map.set(id, p)
      }
    }
  }
  return map
}

/** Prefer full tree path when termGuid is known (SharePoint often stores leaf label only). */
export function resolveMetadataTags(tags: MetadataTag[], tree: TaxNode[]): MetadataTag[] {
  const pathByGuid = buildTermGuidToPathMap(tree)
  return tags.map(tag => {
    const termGuid = tag.termGuid?.trim() ?? ''
    if (termGuid && pathByGuid.has(termGuid)) {
      return { label: pathByGuid.get(termGuid)!, termGuid }
    }
    return { label: normalizeTaxonomyPath(tag.label), termGuid }
  })
}

/** Ancestor + leaf pills — same rules as session detail (SessionTermList). */
export function expandMetadataToPills(tags: MetadataTag[], tree: TaxNode[]): MetadataTagPill[] {
  const resolved = resolveMetadataTags(tags, tree)
  const byPath = new Map<string, MetadataTagPill>()
  const metaByPath = new Map<string, string>()

  for (const tag of resolved) {
    metaByPath.set(normalizeTaxonomyPath(tag.label), tag.termGuid)
  }

  for (const tag of resolved) {
    const parts = taxonomyPathParts(tag.label)
    for (let d = 0; d < parts.length; d++) {
      const pathKey = parts.slice(0, d + 1).join(':')
      const termGuid = metaByPath.get(pathKey) ?? null

      if (!byPath.has(pathKey)) {
        byPath.set(pathKey, { shortLabel: parts[d], pathKey, depth: d, termGuid })
      } else if (termGuid !== null) {
        byPath.get(pathKey)!.termGuid = termGuid
      }
    }
  }

  return [...byPath.values()].sort((a, b) => a.depth - b.depth)
}
