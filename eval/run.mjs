// Eval runner: the production prompt, schema and guardrail code against labelled enquiries.
//   node eval/run.mjs --split dev|test|all [--limit N] [--dry]
// --dry uses a canned AI response (no API call, no cost) to check the plumbing.
// The n8n Code-node bodies come from `build_workflow.py --eval-bundle` and run here unchanged,
// with tiny shims for n8n's $input / $() / $env. Cases use the fictional Example Salon.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const SPLIT = arg('--split', 'dev');
const LIMIT = Number(arg('--limit', 0));
const DRY = process.argv.includes('--dry');
const CONCURRENCY = 4;

// Secrets from .env (never printed)
const env = {};
if (existsSync(join(ROOT, '.env'))) {
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const API_KEY = process.env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY;
if (!DRY && !API_KEY) throw new Error('ANTHROPIC_API_KEY missing (.env)');

const bundle = JSON.parse(execFileSync('python3', [join(ROOT, 'scripts/build_workflow.py'), '--eval-bundle'],
  { env: { ...process.env, CLIENT_PROFILE: 'example' } }).toString());

// Run an n8n Code-node body: it reads $input / $('Node name') and returns [{ json }].
function runNode(code, input, named = {}) {
  const $input = { first: () => ({ json: input }) };
  const $ = name => ({ first: () => ({ json: named[name] }) });
  return new Function('$input', '$', '$env', 'Buffer', code)($input, $, {}, Buffer)[0].json;
}

const cases = readFileSync(join(ROOT, 'eval/cases.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
  .filter(c => SPLIT === 'all' || c.split === SPLIT).slice(0, LIMIT || undefined);

async function callClaude(request) {
  if (DRY) {
    return { stop_reason: 'end_turn', model: 'dry-run', usage: { input_tokens: 0, output_tokens: 0 },
      content: [{ type: 'text', text: JSON.stringify({ intent: 'other', services: [], requested_date: '', urgency: 'normal',
        needs_owner: false, owner_reason: '', reply_draft: 'Hi! A gel overlay is R300. The team will confirm.',
        facts_used: [], confidence: 0.9 }) }] };
  }
  for (let attempt = 1; ; attempt++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'anthropic-version': bundle.anthropic_version, 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (r.ok) return r.json();
    if (attempt >= 4 || ![429, 500, 502, 503, 529].includes(r.status)) {
      throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    await new Promise(res => setTimeout(res, 2000 * attempt));
  }
}

const norm = s => (s || '').replace(/[\s,]/g, '');

async function runCase(c) {
  const enquiry = { ...c.enquiry, email: 'eval@example.com', phone: '0100000000', consent: true };
  const built = runNode(bundle.build_js, enquiry);
  const t0 = Date.now();
  let response, error = null;
  try { response = await callClaude(built.request); } catch (e) { error = String(e.message || e); }
  const ms = Date.now() - t0;
  if (error) return { id: c.id, split: c.split, error, ms };
  let raw = {};
  try { raw = JSON.parse(response.content.find(b => b.type === 'text').text); } catch { /* checked below */ }
  const out = runNode(bundle.check_js, response, { 'Build AI request': { enquiry } });
  const e = c.expect;
  return {
    id: c.id, split: c.split, message: c.enquiry.message, ms,
    expect: e,
    intent: out.intent, intent_ok: out.intent === e.intent,
    model_needs_owner: raw.needs_owner, needs_owner: out.needs_owner, owner_ok: out.needs_owner === e.needs_owner,
    quote_missing: e.must_quote.filter(p => !norm(out.reply_draft).includes(norm(p))),
    checks_failed: out.checks_failed, owner_reason: out.owner_reason,
    confirmed_booking: out.checks_failed.some(x => x.includes('confirms a booking')),
    unknown_price: out.checks_failed.some(x => x.startsWith('price not in')),
    confidence: out.confidence, cost: out.ai_cost_usd, reply_draft: out.reply_draft,
  };
}

const results = [];
for (let i = 0; i < cases.length; i += CONCURRENCY) {
  results.push(...await Promise.all(cases.slice(i, i + CONCURRENCY).map(runCase)));
  process.stderr.write(`\r${results.length}/${cases.length}`);
}
process.stderr.write('\n');

// Metrics
const ok = results.filter(r => !r.error);
const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}% (${n}/${d})` : 'n/a';
const mustEsc = ok.filter(r => r.expect.needs_owner), mayAuto = ok.filter(r => !r.expect.needs_owner);
const quoted = ok.filter(r => r.expect.must_quote.length);
const ms = ok.map(r => r.ms).sort((a, b) => a - b);
const q = p => ms.length ? ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] : 0;
const cost = ok.reduce((s, r) => s + (r.cost || 0), 0);
const metrics = {
  split: SPLIT, model: bundle.model, cases: results.length, errors: results.length - ok.length, dry: DRY,
  intent_accuracy: pct(ok.filter(r => r.intent_ok).length, ok.length),
  escalation_recall: pct(mustEsc.filter(r => r.needs_owner).length, mustEsc.length),
  escalation_recall_model_only: pct(mustEsc.filter(r => r.model_needs_owner).length, mustEsc.length),
  over_escalation: pct(mayAuto.filter(r => r.needs_owner).length, mayAuto.length),
  needs_owner_accuracy: pct(ok.filter(r => r.owner_ok).length, ok.length),
  required_prices_quoted: pct(quoted.filter(r => !r.quote_missing.length).length, quoted.length),
  drafts_confirming_a_booking: ok.filter(r => r.confirmed_booking).length,
  drafts_with_price_not_on_menu: ok.filter(r => r.unknown_price).length,
  cost_usd_total: +cost.toFixed(5), cost_usd_per_enquiry: ok.length ? +(cost / ok.length).toFixed(5) : 0,
  latency_ms_p50: q(0.5), latency_ms_p95: q(0.95),
};

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const dir = join(ROOT, 'eval/results'); mkdirSync(dir, { recursive: true });
const base = join(dir, `${SPLIT}-${DRY ? 'dry-' : ''}${stamp}`);
writeFileSync(`${base}.json`, JSON.stringify({ metrics, results }, null, 2));
const misses = results.filter(r => r.error || !r.intent_ok || !r.owner_ok || r.quote_missing?.length);
const md = [
  `# Eval: ${SPLIT} split (${stamp})`, '', '| Metric | Value |', '|---|---|',
  ...Object.entries(metrics).map(([k, v]) => `| ${k} | ${v} |`), '',
  `## Misses (${misses.length})`, '',
  ...misses.map(r => r.error ? `- **${r.id}** error: ${r.error}` :
    `- **${r.id}** "${r.message}"\n  - intent ${r.intent} (expected ${r.expect.intent}); needs_owner ${r.needs_owner} ` +
    `(expected ${r.expect.needs_owner}; model said ${r.model_needs_owner})` +
    (r.quote_missing.length ? `; missing ${r.quote_missing.join(', ')}` : '') +
    (r.checks_failed.length ? `\n  - checks: ${r.checks_failed.join('; ')}` : '') +
    `\n  - draft: ${r.reply_draft.replace(/\n+/g, ' ')}`),
].join('\n');
writeFileSync(`${base}.md`, md + '\n');
console.log(JSON.stringify(metrics, null, 2));
console.log(`report: ${base.replace(ROOT + '/', '')}.md`);
