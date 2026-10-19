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

/** The contexts, in order, e.g. for a dropdown. */
export const TEMPLATE_CONTEXT_NAMES = Object.keys(TEMPLATE_CONTEXTS) as TemplateContext[];

export function isTemplateContext(value: unknown): value is TemplateContext {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TEMPLATE_CONTEXTS, value);
}

/** A variable a template can use, for the template page's Help. */
export interface TemplateVariable {
  name: string;
  description: string;
}

/**
 * The variables each context's templates can use. Defined once here, for the template page's
 * Help; a test checks the email builders (backend/services/email-vars.ts) give exactly these.
 */
export const TEMPLATE_VARIABLES: Record<TemplateContext, TemplateVariable[]> = {
  Session: [
    { name: 'volunteerName', description: "The volunteer's name" },
    { name: 'groupName', description: "The session's group, e.g. Sheepskull" },
    { name: 'sessionTitle', description: "The session's own title, if it has one" },
    { name: 'formattedDateShort', description: 'The date, short: 23 April' },
    { name: 'formattedDateLong', description: 'The date, long: Thursday, 23 April 2026' },
    { name: 'formattedTime', description: 'The time: 9:30 to 12:30 (about 3 hours)' },
    { name: 'description', description: "The session's description (use {{{nl2br description}}} to keep line breaks)" },
    { name: 'tags', description: "The session's tags, e.g. #DH #Sheepskull, if it has any" },
    { name: 'sessionUrl', description: "Link to the session's page" },
    { name: 'loginUrl', description: 'Link to sign in, then go to the session' },
    { name: 'myChildNames', description: "The names of the children the volunteer is bringing, if any" },
    { name: 'isRegular', description: 'Whether the volunteer is a Regular on this session (for {{#if}})' },
    { name: 'isMember', description: 'Whether the volunteer is a charity member (for {{#if}})' },
    { name: 'baseUrl', description: "The tracker's address, for building links" },
  ],
  Profile: [
    { name: 'name', description: "The volunteer's name" },
    { name: 'email', description: "The volunteer's email address" },
    { name: 'loginUrl', description: 'Link to sign in with that email' },
    { name: 'charityMembershipDate', description: 'When they became a charity member, if they are' },
    { name: 'baseUrl', description: "The tracker's address, for building links" },
  ],
};

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
