import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { BRAND } from '../shared/brand';
import { platform } from '../config';
import type { SharePointTemplate } from '../../types/email-template';

// Named style presets for the section helper — maps style="name" to bg/color/padding
const DEFAULT_PADDING = '24px 32px';
const SECTION_STYLES: Record<string, { bg: string; color: string }> = {
  light: { bg: BRAND.light, color: BRAND.dark  },
  dark:  { bg: BRAND.dark,  color: BRAND.light },
  green: { bg: BRAND.green, color: BRAND.light },
  gold:  { bg: BRAND.gold,  color: BRAND.dark  },
  dirt:  { bg: BRAND.dirt,  color: BRAND.light },
  sand:  { bg: BRAND.sand,  color: BRAND.dark  },
};

// Inline helper: {{{nl2br someVar}}} — escapes text then converts \n to <br>
Handlebars.registerHelper('nl2br', (text: unknown) => {
  if (!text) return '';
  return new Handlebars.SafeString(Handlebars.escapeExpression(String(text)).replace(/\n/g, '<br>'));
});

// Block helper: {{#section style="dark"}}...{{/section}}
// style defaults to "light". padding can be overridden: {{#section style="dark" padding="24px 32px"}}
// Wraps content in the standard MSO-safe centred inner-table row pattern.
Handlebars.registerHelper('section', function(this: unknown, options: Handlebars.HelperOptions) {
  const styleName: string = options.hash.style ?? 'light';
  const preset = SECTION_STYLES[styleName] ?? SECTION_STYLES.light;
  const bg = preset.bg;
  const color = preset.color;
  const padding: string = options.hash.padding ?? DEFAULT_PADDING;
  const content: string = options.fn(this);
  return new Handlebars.SafeString(
    `<tr>` +
    `<td align="center" valign="top" style="padding:0 16px;">` +
    `<!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;"><tr><td><![endif]-->` +
    `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;" bgcolor="${bg}" role="presentation">` +
    `<tr><td bgcolor="${bg}" valign="top" style="background-color:${bg};padding:${padding};font-size:16px;line-height:1.8;color:${color};font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">` +
    content +
    `</td></tr>` +
    `</table>` +
    `<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->` +
    `</td></tr>`
  );
});

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** An email template's Handlebars sources: a row of the Templates list. */
export type EmailTemplateSource = Pick<SharePointTemplate, 'Subject' | 'HTML' | 'Text'>;

const BASE_TEMPLATE = path.join(process.cwd(), 'templates', 'email', 'base.hbs');
let baseTemplate: HandlebarsTemplateDelegate | undefined;

async function loadBase(): Promise<HandlebarsTemplateDelegate> {
  if (baseTemplate && !platform.isLocal) return baseTemplate;
  baseTemplate = Handlebars.compile(await fs.readFile(BASE_TEMPLATE, 'utf-8'));
  return baseTemplate;
}

/** Renders a template's subject, HTML (wrapped in base.hbs) and text with these variables. */
export async function renderEmail(template: EmailTemplateSource, vars: Record<string, unknown>): Promise<RenderedEmail> {
  const renderBase = await loadBase();
  const subject = Handlebars.compile(template.Subject ?? '', { noEscape: true })(vars).trim();
  const text = Handlebars.compile(template.Text ?? '')(vars).trim();
  const body = Handlebars.compile(template.HTML ?? '')(vars);
  const html = renderBase({ ...vars, body }).replace(/>\s+</g, '><');

  return { subject, html, text };
}
