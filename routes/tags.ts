import express, { Request, Response, Router } from 'express';
import { taxonomyClient } from '../services/taxonomy-client';
import { SESSION_METADATA } from '../services/field-names';

const router: Router = express.Router();

const SESSIONS_LIST_GUID = process.env.SESSIONS_LIST_GUID!;

/**
 * GET /api/tags/taxonomy
 *
 * Resolves the term set ID via two methods in priority order:
 *  1. Column discovery — reads termColumn.termSet.termSetId from the Metadata column
 *     definition on the Sessions list. Works automatically once the column is configured
 *     as a Managed Metadata column in SharePoint.
 *  2. Env var fallback — TAXONOMY_TERM_SET_ID, for when the column is still plain text
 *     or the Graph API doesn't return termColumn for the column type.
 */
router.get('/tags/taxonomy', async (req: Request, res: Response) => {
  try {
    let termSetId = await taxonomyClient.getTermSetIdForColumn(SESSIONS_LIST_GUID, SESSION_METADATA);

    if (termSetId) {
      console.log(`[Tags] Term set ID from column definition: ${termSetId}`);
    } else {
      termSetId = process.env.TAXONOMY_TERM_SET_ID || null;
      if (termSetId) {
        console.log(`[Tags] Term set ID from TAXONOMY_TERM_SET_ID env var: ${termSetId}`);
      } else {
        console.log(`[Tags] No term set ID found — Metadata column is not Managed Metadata and TAXONOMY_TERM_SET_ID is not set`);
        res.json({ success: true, data: [] });
        return;
      }
    }

    const tree = await taxonomyClient.getTermSetTree(termSetId);
    res.json({ success: true, data: tree });
  } catch (error: any) {
    console.error('Error fetching tag taxonomy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export = router;
