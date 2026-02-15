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
