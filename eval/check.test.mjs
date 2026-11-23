// Unit tests for the production guardrail code (no API calls): node eval/check.test.mjs
// Runs the exact "Check AI output" Code-node body against hand-written drafts (Example Salon facts).
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { check_js } = JSON.parse(execFileSync('python3', [join(ROOT, 'scripts/build_workflow.py'), '--eval-bundle'],
  { env: { ...process.env, CLIENT_PROFILE: 'example' } }).toString());

function check(reply_draft, enquiry = { message: '', preferredDate: '' }, extra = {}) {
  const ai = { intent: 'price_question', services: [], requested_date: '', urgency: 'normal', needs_owner: false,
    owner_reason: '', reply_draft, facts_used: [], confidence: 0.9, ...extra };
  const response = { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(ai) }], usage: {} };
  const $input = { first: () => ({ json: response }) };
  const $ = () => ({ first: () => ({ json: { enquiry } }) });
  return new Function('$input', '$', '$env', 'Buffer', check_js)($input, $, {}, Buffer)[0].json;
}

const priceFlag = out => out.checks_failed.find(x => x.startsWith('price not in')) || null;
const cases = [
  // [name, draft, should the price check flag it?]
  ['menu price', 'A gel overlay is R300 (60 min).', false],
  ['menu price with a space', 'The Pamper Party is R1 600 for 4 guests.', false],
  ['per-unit multiple', 'Nail art is R10 per nail, so two nails would be R20.', false],
  ['total of verified prices', 'An acrylic set is R450 and nail art is R10 per nail, so two nails add R20: R470 in total.', false],
  ['party total', 'R1 600 for 4 guests plus R350 per extra guest, so 5 guests would be R1 950.', false],
  ['three-item total', 'A classic manicure (R220), pedicure (R280) and brow shape (R180): R680 altogether.', false],
  ['total with unwritten per-unit multiple', 'R1 600 for 4 guests plus R350 per extra guest, so for 6 of you R2 300.', false],
  ['wrong total with per-unit price', 'R1 600 for 4 guests plus R350 per extra guest, so for 6 of you R2 400.', true],
  ['hallucinated price', 'A classic lash set is R600.', true],
  ['multiple of a non-per-unit price', 'Two gel overlays would be R600.', true],
  ['customer-claimed price', 'I can see you mentioned R230 for a lash set; the team will confirm.', true],
  ['made-up total', 'A gel overlay (R300) and a pedicure (R280) come to R640.', true],
  ['per-unit price not quoted', 'Nail art on all ten nails is R100.', true],
  ['unrelated large number', 'A full set is R450, or R2 400 for the deluxe option.', true],
];

let failed = 0;
for (const [name, draft, shouldFlag] of cases) {
  const flag = priceFlag(check(draft));
  const ok = Boolean(flag) === shouldFlag;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${flag ? `  (${flag})` : ''}`);
}
// Other guardrails stay intact
const confirm = check('Great news, you are booked for Saturday at 10!');
const weekday = check('The team will confirm.', { message: 'Friday please', preferredDate: '2026-11-28' });
const t = [
  ['booking confirmation flagged', confirm.checks_failed.some(x => x.includes('confirms a booking'))],
  ['weekday mismatch flagged', weekday.checks_failed.some(x => x.includes('picked 2026-11-28'))],
  ['flags force needs_owner', confirm.needs_owner === true],
];
for (const [name, ok] of t) { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); }
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
