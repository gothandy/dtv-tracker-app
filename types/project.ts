/**
 * Project entity types
 */

import { SharePointBaseItem } from './group';

export interface SharePointProject extends SharePointBaseItem {
  Title: string;
  Name?: string;
  Description?: string;
  Metadata?: string;
  [key: string]: unknown;
}

export interface Project {
  sharePointId: number;
  lookupKeyName: string;
  displayName?: string;
  description?: string;
}
