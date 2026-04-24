require('dotenv').config();

const API_KEY = process.env.EVENTBRITE_API_KEY;
const EVENT_ID = process.argv[2] || '1977369159385';

async function fetchEB(path) {
  const res = await fetch('https://www.eventbriteapi.com/v3' + path, {
    headers: { Authorization: 'Bearer ' + API_KEY }
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Eventbrite ' + res.status + ': ' + JSON.stringify(data));
  return data;
}

async function main() {
  console.log('=== Event', EVENT_ID, '===\n');

  const questions = await fetchEB('/events/' + EVENT_ID + '/questions/');
  console.log('Questions defined on this event:');
  if (!questions.questions || questions.questions.length === 0) {
    console.log('  (none)');
  }
  for (const q of (questions.questions || [])) {
    console.log('  [' + q.id + '] "' + (q.question?.html || q.question) + '" (type: ' + q.type + ')');
  }

  console.log('\nAttendees (first 5 with answers):');
  const data = await fetchEB('/events/' + EVENT_ID + '/attendees/?status=attending&expand=answers');
  console.log('Total attendees:', data.attendees?.length || 0);
  const sorted = (data.attendees || []).sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  for (const a of sorted.slice(0, 5)) {
    console.log('\n  ' + (a.profile?.name || 'Unknown') + ' (registered: ' + a.created + ')');
    if (a.answers && a.answers.length > 0) {
      for (const ans of a.answers) {
        console.log('    [Q' + ans.question_id + '] raw: ' + JSON.stringify(ans));
      }
    } else {
      console.log('    (no answers)');
    }
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
