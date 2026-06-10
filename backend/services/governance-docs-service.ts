/**
 * Governance docs — reads the Docs/ folder from the Documents library (DOCUMENTS_DRIVE_ID).
 * Listing returns stable tracker URLs; PDF bytes are served via app.js proxy (project docs pattern).
 */

import { sharePointClient } from './sharepoint-client';
import { tryDocumentsDriveId } from './documents-drive';
import { nameToSlug } from './data-layer';
import { isFileProxyCacheValid } from './file-proxy-cache-ttl';
import type { DocsTreeNode } from '../../types/api-responses';

export const GOVERNANCE_DOCS_ROOT = 'Docs';

interface InternalDocsNode {
  name: string;
  slug: string;
  type: 'folder' | 'file';
  spPath: string;
  slugPath: string;
  children?: InternalDocsNode[];
}

function folderSlug(name: string): string {
  return nameToSlug(name);
}

/** URL segment for a PDF — same rules as profile nameToSlug, keeps .pdf suffix. */
export function fileSlug(filename: string): string {
  const match = filename.match(/^(.*)(\.pdf)$/i);
  if (match) {
    return `${nameToSlug(match[1])}.pdf`;
  }
  return nameToSlug(filename);
}

function docFileUrl(slugPath: string): string {
  return `/docs/${slugPath}`;
}

function toPublicNode(node: InternalDocsNode): DocsTreeNode {
  if (node.type === 'file') {
    return {
      name: node.name,
      slug: node.slug,
      type: 'file',
      url: docFileUrl(node.slugPath),
    };
  }
  return {
    name: node.name,
    slug: node.slug,
    type: 'folder',
    children: (node.children ?? []).map(toPublicNode),
  };
}

async function buildInternalTree(
  driveId: string,
  spFolderPath: string,
  slugSegments: string[],
): Promise<InternalDocsNode[]> {
  const children = await sharePointClient.listGovernanceFolderChildren(driveId, spFolderPath);
  const nodes: InternalDocsNode[] = [];

  for (const child of children) {
    const childSpPath = `${spFolderPath}/${child.name}`;
    if (child.isFolder) {
      const slug = folderSlug(child.name);
      const slugPath = [...slugSegments, slug].join('/');
      const grandchildren = await buildInternalTree(driveId, childSpPath, [...slugSegments, slug]);
      nodes.push({
        name: child.name,
        slug,
        type: 'folder',
        spPath: childSpPath,
        slugPath,
        children: grandchildren,
      });
    } else {
      const slug = fileSlug(child.name);
      const slugPath = [...slugSegments, slug].join('/');
      nodes.push({
        name: child.name,
        slug,
        type: 'file',
        spPath: childSpPath,
        slugPath,
      });
    }
  }

  return nodes;
}

let cachedInternalTree: { tree: InternalDocsNode[]; fetchedAt: number } | null = null;

async function getInternalTree(): Promise<InternalDocsNode[]> {
  if (cachedInternalTree && isFileProxyCacheValid(cachedInternalTree.fetchedAt)) {
    return cachedInternalTree.tree;
  }
  const driveId = tryDocumentsDriveId();
  if (!driveId) return [];
  const tree = await buildInternalTree(driveId, GOVERNANCE_DOCS_ROOT, []);
  cachedInternalTree = { tree, fetchedAt: Date.now() };
  return tree;
}

export function clearGovernanceDocsTreeCache(): void {
  cachedInternalTree = null;
  sharePointClient.clearGovernanceFolderCache();
}

export async function getGovernanceDocsTree(): Promise<DocsTreeNode[]> {
  const tree = await getInternalTree();
  return tree.map(toPublicNode);
}

function findBySlugPath(nodes: InternalDocsNode[], segments: string[]): InternalDocsNode | undefined {
  if (!segments.length) return undefined;
  const [head, ...rest] = segments;
  const node = nodes.find(n => n.slug === head);
  if (!node) return undefined;
  if (!rest.length) return node;
  if (node.type !== 'folder' || !node.children) return undefined;
  return findBySlugPath(node.children, rest);
}

export async function resolveGovernanceDocSlugPath(slugPath: string): Promise<string | null> {
  const segments = slugPath.split('/').filter(Boolean);
  if (!segments.length) return null;
  const tree = await getInternalTree();
  const node = findBySlugPath(tree, segments);
  if (!node || node.type !== 'file') return null;
  return node.spPath;
}

export async function fetchGovernanceDocPdf(slugPath: string): Promise<Buffer | null> {
  const driveId = tryDocumentsDriveId();
  if (!driveId) return null;
  const spPath = await resolveGovernanceDocSlugPath(slugPath);
  if (!spPath) return null;
  return sharePointClient.downloadFile(driveId, spPath);
}
