/**
 * Email templates: rows in the SharePoint "Templates" list, shown in the tracker as
 * "Email templates". Each row's Context says what the email is about, which decides the
 * data it can use, who it goes to and where it's offered.
 *
 * Defined once here: the keys are the Context column's choices in SharePoint, so a new
 * context is a new choice there and a new entry here.
 */
export const TEMPLATE_CONTEXTS = {
  /** About one session: sent to its entries, each personalised, from the session page. */
  Session: { offeredOn: 'the session page' },
  /** About one volunteer: sent to the ticked profiles, from the Profiles page. */
  Profile: { offeredOn: 'the Profiles page' },
} as const;

export type TemplateContext = keyof typeof TEMPLATE_CONTEXTS;

export function isTemplateContext(value: unknown): value is TemplateContext {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TEMPLATE_CONTEXTS, value);
}

/** A row of the Templates list, as SharePoint returns it. */
export interface SharePointTemplate {
  ID: number;
  Title?: string;
  Context?: string;
  /** Handlebars, rendered without HTML escaping. */
  Subject?: string;
  /** Handlebars; wrapped in templates/email/base.hbs. */
  HTML?: string;
  /** Handlebars; the plain-text version of the email. */
  Text?: string;
}
