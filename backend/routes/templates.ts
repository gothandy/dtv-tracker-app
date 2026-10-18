import express, { Request, Response, Router } from 'express';
import { templatesRepository } from '../services/repositories/templates-repository';
import { renderEmail } from '../services/email-renderer';
import { sampleTemplateVars } from '../services/email-vars';
import { requestOrigin } from '../services/request-origin';
import { requirePermission } from '../middleware/require-permission';
import { isTemplateContext, type SharePointTemplate, type TemplateContext } from '../../types/email-template';
import { can } from '../../types/permissions';
import { sharePoint, SHAREPOINT_ADDRESSES } from '../config';
import type { TemplateResponse, TemplateDetailResponse } from '../../types/api-responses';
import type { ApiResponse } from '../../types/sharepoint';

const router: Router = express.Router();

function toResponse(t: SharePointTemplate & { Context: TemplateContext }): TemplateResponse {
  return {
    id: t.ID,
    title: t.Title || `Template ${t.ID}`,
    context: t.Context,
    subject: t.Subject ?? '',
    text: t.Text ?? '',
  };
}

const hasContext = (t: SharePointTemplate): t is SharePointTemplate & { Context: TemplateContext } =>
  isTemplateContext(t.Context);

// GET /api/templates[?context=Session] — email templates, all or one context's, by title.
router.get('/templates', requirePermission('viewTemplates'), async (req: Request, res: Response) => {
  try {
    const context = req.query.context;
    if (context !== undefined && !isTemplateContext(context)) {
      res.status(400).json({ success: false, error: 'context must be Session or Profile' });
      return;
    }

    const data = (await templatesRepository.getAll())
      .filter(hasContext)
      .filter(t => context === undefined || t.Context === context)
      .map(toResponse)
      .sort((a, b) => a.title.localeCompare(b.title));

    res.json({ success: true, data } as ApiResponse<TemplateResponse[]>);
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email templates', message: error.message });
  }
});

// GET /api/templates/:id — one template, with a preview from made-up data for its context.
router.get('/templates/:id', requirePermission('viewTemplates'), async (req: Request, res: Response) => {
  try {
    const template = (await templatesRepository.getAll())
      .filter(hasContext)
      .find(t => t.ID === Number(req.params.id));
    if (!template) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }

    let preview: TemplateDetailResponse['preview'];
    try {
      preview = await renderEmail(template, sampleTemplateVars(template.Context, requestOrigin(req)));
    } catch (error: any) {
      // A mistake in the template's Handlebars: show it, so it can be put right.
      preview = { subject: '', html: '', text: `This template can't be rendered: ${error.message}` };
    }

    const data: TemplateDetailResponse = {
      ...toResponse(template),
      preview,
      editUrl: can(req.session.user?.role, 'editTemplates')
        ? `${sharePoint.siteUrl}/${SHAREPOINT_ADDRESSES.lists.templates}/EditForm.aspx?ID=${template.ID}`
        : undefined,
    };
    res.json({ success: true, data } as ApiResponse<TemplateDetailResponse>);
  } catch (error: any) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email template', message: error.message });
  }
});

export = router;
