/**
 * Project entity types
 */

import { SharePointBaseItem } from './group';

export interface SharePointProject extends SharePointBaseItem {
  Title: string;
  Name?: string;
  Description?: string;
  Metadata?: string;
  /** Choice column; empty when not set. */
  Status?: string | null;
  [key: string]: unknown;
}

export interface Project {
  sharePointId: number;
  lookupKeyName: string;
  displayName?: string;
  description?: string;
  status?: string;
}
