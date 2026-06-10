/**
 * Project documents — reads Projects/{key}/ on the Documents library (DOCUMENTS_DRIVE_ID).
 * Listing returns a folder tree with stable tracker URLs; bytes are served via app.js proxy.
 */

import { sharePointClient } from './sharepoint-client';
import { tryDocumentsDriveId } from './documents-drive';
import { nameToSlug } from './data-layer';
import { isFileProxyCacheValid } from './file-proxy-cache-ttl';
import type { DocsTreeNode } from '../../types/api-responses';

interface InternalProjectDocNode {
  name: string;
  slug: string;
  type: 'folder' | 'file';
  spPath: string;
  slugPath: string;
  itemId?: string;
  children?: InternalProjectDocNode[];
}

function folderSlug(name: string): string {
  return nameToSlug(name);
}

/** Slug for any project file — nameToSlug on basename, lowercase extension preserved. */
export function projectFileSlug(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot > 0) {
    return `${nameToSlug(filename.slice(0, dot))}${filename.slice(dot).toLowerCase()}`;
  }
  return nameToSlug(filename);
}

function projectDocsRoot(key: string): string {
  return `Projects/${key}`;
}

function projectDocUrl(key: string, slugPath: string): string {
  return `/projects/${key}/docs/${slugPath}`;
}

function toPublicNode(key: string, node: InternalProjectDocNode): DocsTreeNode {
  if (node.type === 'file') {
    return {
      name: node.name,
      slug: node.slug,
      type: 'file',
      url: projectDocUrl(key, node.slugPath),
      id: node.itemId,
    };
  }
  return {
    name: node.name,
    slug: node.slug,
    type: 'folder',
    children: (node.children ?? []).map(child => toPublicNode(key, child)),
  };
}

async function buildInternalTree(
  driveId: string,
  spFolderPath: string,
  slugSegments: string[],
): Promise<InternalProjectDocNode[]> {
  const children = await sharePointClient.listProjectDocsFolderChildren(driveId, spFolderPath);
  const nodes: InternalProjectDocNode[] = [];

  for (const child of children) {
    const childSpPath = `${spFolderPath}/${child.name}`;
    if (child.isFolder) {
      const slug = folderSlug(child.name);
      const grandchildren = await buildInternalTree(driveId, childSpPath, [...slugSegments, slug]);
      nodes.push({
        name: child.name,
        slug,
        type: 'folder',
        spPath: childSpPath,
        slugPath: [...slugSegments, slug].join('/'),
        children: grandchildren,
      });
    } else {
      const slug = projectFileSlug(child.name);
      nodes.push({
        name: child.name,
        slug,
        type: 'file',
        spPath: childSpPath,
        slugPath: [...slugSegments, slug].join('/'),
        itemId: child.id,
      });
    }
  }

  return nodes;
}

const treeCache = new Map<string, { tree: InternalProjectDocNode[]; fetchedAt: number }>();

async function getInternalTree(projectKey: string): Promise<InternalProjectDocNode[]> {
  const cached = treeCache.get(projectKey);
  if (cached && isFileProxyCacheValid(cached.fetchedAt)) {
    return cached.tree;
  }
  const driveId = tryDocumentsDriveId();
  if (!driveId) return [];
  const root = projectDocsRoot(projectKey);
  const tree = await buildInternalTree(driveId, root, []);
  treeCache.set(projectKey, { tree, fetchedAt: Date.now() });
  return tree;
}

export function clearProjectDocsTreeCache(projectKey?: string): void {
  if (!projectKey) {
    treeCache.clear();
    sharePointClient.clearProjectDocsFolderCache();
    return;
  }
  treeCache.delete(projectKey);
  sharePointClient.clearProjectDocsFolderCache(projectKey);
}

export async function getProjectDocsTree(projectKey: string): Promise<DocsTreeNode[]> {
  const tree = await getInternalTree(projectKey);
  return tree.map(node => toPublicNode(projectKey, node));
}

function findBySlugPath(nodes: InternalProjectDocNode[], segments: string[]): InternalProjectDocNode | undefined {
  if (!segments.length) return undefined;
  const [head, ...rest] = segments;
  const node = nodes.find(n => n.slug === head);
  if (!node) return undefined;
  if (!rest.length) return node;
  if (node.type !== 'folder' || !node.children) return undefined;
  return findBySlugPath(node.children, rest);
}

export async function resolveProjectDocSlugPath(
  projectKey: string,
  slugPath: string,
): Promise<string | null> {
  const segments = slugPath.split('/').filter(Boolean);
  if (!segments.length) return null;
  const tree = await getInternalTree(projectKey);
  const node = findBySlugPath(tree, segments);
  if (!node || node.type !== 'file') return null;
  return node.spPath;
}

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function contentTypeForFilename(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return 'application/octet-stream';
  return MIME_BY_EXT[name.slice(dot).toLowerCase()] ?? 'application/octet-stream';
}

export async function fetchProjectDoc(
  projectKey: string,
  slugPath: string,
): Promise<{ data: Buffer; contentType: string; name: string } | null> {
  const driveId = tryDocumentsDriveId();
  if (!driveId) return null;
  const spPath = await resolveProjectDocSlugPath(projectKey, slugPath);
  if (!spPath) return null;
  const data = await sharePointClient.downloadFile(driveId, spPath);
  if (!data) return null;
  const name = spPath.split('/').pop() ?? slugPath;
  return { data, contentType: contentTypeForFilename(name), name };
}

/** Stable URL for a file uploaded to the project root folder. */
export function projectDocUrlForFilename(projectKey: string, filename: string): string {
  return projectDocUrl(projectKey, projectFileSlug(filename));
}
