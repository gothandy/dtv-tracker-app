/**
 * Taxonomy Client
 *
 * Handles all SharePoint Managed Metadata (term store) operations via Microsoft Graph API.
 * Depends on SharePointClient for authentication and base Graph API access.
 */

import axios from 'axios';
import { SharePointClient, sharePointClient } from './sharepoint-client';

export class TaxonomyClient {
  private sp: SharePointClient;
  // Caches the hidden companion field name for each taxonomy column (never changes after creation)
  private hiddenFieldCache = new Map<string, string>();

  constructor(sp: SharePointClient) {
    this.sp = sp;
  }

  /**
   * Fetch a term set tree from the SharePoint Term Store.
   *
   * Graph API beta term store quirks discovered via test/test-taxonomy.js:
   * - $expand=children is silently ignored on /children endpoints
   * - Children must be fetched individually via /sets/{setId}/terms/{termId}/children
   *
   * We fetch root terms, then recursively fetch children for each term in parallel.
   * The full tree is cached (5-min TTL) so the burst of API calls only happens once.
   */
  async getTermSetTree(termSetId: string): Promise<{ label: string; id: string; children?: any[] }[]> {
    const cacheKey = `termset-${termSetId}`;
    const cached = this.sp.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as any[];
    }

    const token = await this.sp.getAccessToken();
    const rootUrl = `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/children`;
    const rootResponse = await axios.get(rootUrl, { headers: { 'Authorization': `Bearer ${token}` } });
    const rootTerms = rootResponse.data.value || [];
    console.log(`[TermSet] ${rootTerms.length} root terms, fetching full tree...`);

    const tree = await this.fetchTermChildren(termSetId, rootTerms, token);
    this.sp.cache.set(cacheKey, tree);
    return tree;
  }

  private async fetchTermChildren(
    termSetId: string,
    terms: any[],
    token: string
  ): Promise<{ label: string; id: string; children?: any[] }[]> {
    return Promise.all(terms.map(async (term: any) => {
      const defaultLabel = (term.labels || []).find((l: any) => l.isDefault) ?? term.labels?.[0];
      const label: string = defaultLabel?.name ?? 'Unknown';
      const node: { label: string; id: string; children?: any[] } = { label, id: term.id };

      const childUrl = `https://graph.microsoft.com/beta/termStore/sets/${termSetId}/terms/${term.id}/children`;
      const childResponse = await axios.get(childUrl, { headers: { 'Authorization': `Bearer ${token}` } });
      const children = childResponse.data.value || [];

      if (children.length > 0) {
        node.children = await this.fetchTermChildren(termSetId, children, token);
      }

      return node;
    }));
  }

  /**
   * Discover the Graph API field name of the hidden note field that backs a Managed Metadata column.
   *
   * Every taxonomy (Managed Metadata) column has a hidden companion field (displayName: "{FieldName}_0")
   * whose Graph API `name` is a GUID-like string (e.g. "g66e7e4fecb04f258f5225e97aa70a86").
   * Writing to this hidden field via the normal Graph API /fields PATCH is how you update MM values.
   *
   * Cached in memory — the hidden field name never changes after column creation.
   */
  private async getTaxonomyHiddenFieldName(listGuid: string, fieldDisplayName: string): Promise<string> {
    const cacheKey = `tax-hidden:${listGuid}:${fieldDisplayName}`;
    const cached = this.hiddenFieldCache.get(cacheKey);
    if (cached) return cached;

    const token = await this.sp.getAccessToken();
    const siteId = await this.sp.getSiteId();
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/columns?expand=hidden`;
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    const cols: any[] = response.data.value || [];

    // The hidden note field for a column named "Metadata" has displayName "Metadata_0"
    const hiddenCol = cols.find(c => c.hidden && c.displayName === `${fieldDisplayName}_0`);
    if (!hiddenCol) {
      throw new Error(`Cannot find hidden note field for taxonomy column '${fieldDisplayName}' — is it a Managed Metadata column?`);
    }

    console.log(`[Taxonomy] Hidden field for '${fieldDisplayName}': name="${hiddenCol.name}" (displayName="${hiddenCol.displayName}")`);
    this.hiddenFieldCache.set(cacheKey, hiddenCol.name);
    return hiddenCol.name;
  }

  /**
   * Update a Managed Metadata (taxonomy) column on a SharePoint list item via Graph API.
   *
   * The Graph API /fields PATCH rejects all direct writes to taxonomy fields.
   * The workaround: write to the hidden companion field (displayName "{FieldName}_0") using
   * the SharePoint taxonomy string format "-1;#Label1|TermGuid1;-1;#Label2|TermGuid2".
   * This updates the MM column natively — no SharePoint REST or extra permissions needed.
   */
  async updateManagedMetadataField(
    listGuid: string,
    itemId: number,
    fieldDisplayName: string,
    tags: Array<{ label: string; termGuid: string }>
  ): Promise<void> {
    const hiddenFieldName = await this.getTaxonomyHiddenFieldName(listGuid, fieldDisplayName);
    const token = await this.sp.getAccessToken();
    const siteId = await this.sp.getSiteId();
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listGuid}/items/${itemId}/fields`;

    // Format: "-1;#Label|TermGuid" per term, joined with ";" for multi-value; empty string to clear
    const noteValue = tags.map(t => `-1;#${t.label}|${t.termGuid}`).join(';');

    try {
      await axios.patch(url, { [hiddenFieldName]: noteValue }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      this.sp.clearCache();
    } catch (error: any) {
      const spError = error.response?.data?.error?.message;
      console.error(`Error updating taxonomy field '${fieldDisplayName}' on item ${itemId}:`, error.response?.data || error.message);
      throw new Error(spError || error.message);
    }
  }
}

export const taxonomyClient = new TaxonomyClient(sharePointClient);
