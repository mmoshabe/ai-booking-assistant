// Unit tests for the free-slot maths used by the calendar nodes (no API calls): node eval/slots.test.mjs
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { slot_lib } = JSON.parse(execFileSync('python3', [join(ROOT, 'scripts/build_workflow.py'), '--eval-bundle'],
  { env: { ...process.env, CLIENT_PROFILE: 'example' } }).toString());
const { parseHours, searchDays, freeSlots } = new Function(`${slot_lib}; return { parseHours, searchDays, freeSlots };`)();

const hours = parseHours('tue-fri 09:00-18:00; sat 08:00-14:00');
const now = new Date('2026-11-23T08:00:00+02:00');          // Monday 08:00 in Johannesburg
const labels = slots => slots.map(s => s.label);
let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`);
};

eq('hours parsed (Tue-Fri, Sat; Sun/Mon closed)', Object.keys(hours).map(Number), [2, 3, 4, 5, 6]);
eq('open preferred date is used alone', searchDays('2026-11-28', hours, now), ['2026-11-28']);
eq('closed preferred date -> next open days', searchDays('2026-11-29', hours, now), ['2026-12-01', '2026-12-02', '2026-12-03']);
eq('no date -> next 3 open days from tomorrow', searchDays('', hours, now), ['2026-11-24', '2026-11-25', '2026-11-26']);
eq('past date ignored', searchDays('2026-11-01', hours, now), ['2026-11-24', '2026-11-25', '2026-11-26']);
eq('garbage date ignored', searchDays('next week', hours, now), ['2026-11-24', '2026-11-25', '2026-11-26']);

eq('empty Saturday: early, midday, last start for 60 min',
  labels(freeSlots({ hours, days: ['2026-11-28'], busy: [], slotMin: 60, now })),
  ['Sat 28 Nov 08:00', 'Sat 28 Nov 10:30', 'Sat 28 Nov 13:00']);

const busy = [{ start: '2026-11-28T06:00:00Z', end: '2026-11-28T09:00:00Z' }];   // 08:00-11:00 local
eq('busy morning skipped, no overlap',
  labels(freeSlots({ hours, days: ['2026-11-28'], busy, slotMin: 60, now })),
  ['Sat 28 Nov 11:00', 'Sat 28 Nov 12:00', 'Sat 28 Nov 13:00']);

eq('fully booked day -> nothing',
  freeSlots({ hours, days: ['2026-11-28'], busy: [{ start: '2026-11-28T00:00:00Z', end: '2026-11-28T23:00:00Z' }], slotMin: 60, now }),
  []);

eq('several days -> one per day, in time order',
  labels(freeSlots({ hours, days: ['2026-11-24', '2026-11-25', '2026-11-26'], busy: [], slotMin: 60, now })),
  ['Tue 24 Nov 09:00', 'Wed 25 Nov 09:00', 'Thu 26 Nov 09:00']);

const lateNow = new Date('2026-11-28T10:15:00+02:00');      // Saturday 10:15: earliest start 12:15
eq('2-hour notice on the same day',
  labels(freeSlots({ hours, days: ['2026-11-28'], busy: [], slotMin: 60, now: lateNow })),
  ['Sat 28 Nov 12:30', 'Sat 28 Nov 13:00']);
eq('too late in the day -> nothing',
  freeSlots({ hours, days: ['2026-11-28'], busy: [], slotMin: 60, now: new Date('2026-11-28T11:15:00+02:00') }),
  []);

eq('treatment must end by closing (120 min on Saturday)',
  labels(freeSlots({ hours, days: ['2026-11-28'], busy: [], slotMin: 120, now })).at(-1),
  'Sat 28 Nov 12:00');

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
