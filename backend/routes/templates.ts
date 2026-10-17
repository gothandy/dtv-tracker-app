import express, { Request, Response, Router } from 'express';
import { templatesRepository } from '../services/repositories/templates-repository';
import { isTemplateContext } from '../../types/email-template';
import type { TemplateResponse } from '../../types/api-responses';
import type { ApiResponse } from '../../types/sharepoint';

const router: Router = express.Router();

// GET /api/templates?context=Session — the email templates for one context, by title.
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const context = req.query.context;
    if (!isTemplateContext(context)) {
      res.status(400).json({ success: false, error: 'context is required (Session or Profile)' });
      return;
    }

    const data: TemplateResponse[] = (await templatesRepository.getAll())
      .filter(t => t.Context === context)
      .map(t => ({ id: t.ID, title: t.Title || `Template ${t.ID}`, context }))
      .sort((a, b) => a.title.localeCompare(b.title));

    res.json({ success: true, data } as ApiResponse<TemplateResponse[]>);
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email templates', message: error.message });
  }
});

export = router;
