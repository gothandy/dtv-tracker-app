import { taxonomyClient } from './taxonomy-client';

export interface MetadataTag {
  label: string;
  termGuid: string;
}

export function normalizeMetadataTagsInput(tags: unknown): MetadataTag[] | null {
  if (!Array.isArray(tags)) return null;
  const normalized = tags
    .map((t: { label?: string; termGuid?: string }) => ({
      label: t.label ?? '',
      termGuid: t.termGuid ?? '',
    }))
    .filter(t => t.label);
  return normalized;
}

export async function updateListItemMetadata(
  listGuid: string,
  itemId: number,
  fieldName: string,
  tags: MetadataTag[]
): Promise<void> {
  await taxonomyClient.updateManagedMetadataField(listGuid, itemId, fieldName, tags);
}
