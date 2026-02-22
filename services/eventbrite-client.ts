/**
 * Eventbrite API Client
 *
 * Thin wrapper around the Eventbrite v3 API.
 * Requires EVENTBRITE_API_KEY environment variable.
 */

const BASE_URL = 'https://www.eventbriteapi.com/v3';

export interface EventbriteAnswer {
  question_id: string;
  question: string;
  answer: string;
}

export interface EventbriteAttendee {
  id: string;
  created: string;
  profile: {
    name: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  status: string;
  checked_in: boolean;
  ticket_class_name?: string;
  answers?: EventbriteAnswer[];
}

async function fetchEventbrite<T>(path: string): Promise<T> {
  const apiKey = process.env.EVENTBRITE_API_KEY;
  if (!apiKey) throw new Error('EVENTBRITE_API_KEY not configured');

  const url = `${BASE_URL}${path}`;
  console.log(`[Eventbrite] GET ${url}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Eventbrite API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface EventbriteEvent {
  id: string;
  seriesId?: string;
  name: string;
  startDate: string;
  description?: string;
}

export async function getOrgEvents(): Promise<EventbriteEvent[]> {
  const orgId = process.env.EVENTBRITE_ORGANIZATION_ID;
  if (!orgId) throw new Error('EVENTBRITE_ORGANIZATION_ID not configured');

  const all: EventbriteEvent[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchEventbrite<{
      events: Array<{
        id: string;
        series_id?: string;
        name?: { text?: string };
        start?: { utc?: string };
        description?: { text?: string };
      }>;
      pagination: { has_more_items: boolean };
    }>(`/organizations/${orgId}/events/?status=live&page_size=100&page=${page}`);

    for (const e of (data.events || [])) {
      all.push({
        id: e.id,
        seriesId: e.series_id || undefined,
        name: e.name?.text || '',
        startDate: e.start?.utc || '',
        description: e.description?.text || undefined
      });
    }

    hasMore = data.pagination?.has_more_items || false;
    page++;
  }

  return all;
}

export async function getAttendees(eventId: string): Promise<EventbriteAttendee[]> {
  const all: EventbriteAttendee[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchEventbrite<{
      attendees: EventbriteAttendee[];
      pagination: { has_more_items: boolean; page_number: number };
    }>(`/events/${eventId}/attendees/?status=attending&expand=answers&page=${page}`);

    all.push(...(data.attendees || []));
    hasMore = data.pagination?.has_more_items || false;
    page++;
  }

  return all;
}

export interface EventbriteConfigCheck {
  eventId: string;
  eventName: string;
  hasChildTicket: boolean;
  hasPrivacyConsentQuestion: boolean;
  hasPhotoConsentQuestion: boolean;
  consentQuestionsPerAttendee: boolean;
}

export async function getEventConfigCheck(eventId: string, eventName: string): Promise<EventbriteConfigCheck> {
  const [ticketData, questionData] = await Promise.all([
    fetchEventbrite<{ ticket_classes: Array<{ name: string }> }>(`/events/${eventId}/ticket_classes/`),
    fetchEventbrite<{ questions: Array<{ respondent: string; question: { text: string } }> }>(`/events/${eventId}/questions/`)
  ]);

  const tickets = ticketData.ticket_classes || [];
  const questions = questionData.questions || [];

  return {
    eventId,
    eventName,
    hasChildTicket: tickets.some(t => t.name.toLowerCase().includes('child')),
    hasPrivacyConsentQuestion: questions.some(q => q.question.text === 'Personal Data Consent'),
    hasPhotoConsentQuestion: questions.some(q => q.question.text === 'Photo and Video Consent'),
    consentQuestionsPerAttendee: questions.some(q => q.respondent === 'attendee')
  };
}
