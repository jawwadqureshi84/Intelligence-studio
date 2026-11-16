import test from 'node:test';
import assert from 'node:assert/strict';
import { nextStep, markSent, setStage, isStopped } from '../lib/followups';
import { proposalMd, proposalHtml } from '../lib/proposal';
import { draftOutreach } from '../lib/analyze';

const base = { outreach_stage: 'Not contacted', outreach_started: null as string | null, outreach_log: [] as any[] };
test('no sequence until first send', () => assert.equal(nextStep(base), null));
test('sending step 0 schedules LinkedIn at day 3', () => {
  const r = markSent(base, 0, '2026-11-10');
  assert.equal(r.outreach_stage, 'Email sent'); assert.equal(r.next_followup, '2026-11-13');
});
test('overdue is computed', () => {
  const r = markSent(base, 0, '2026-11-10');
  const n = nextStep(r, '2026-11-16')!; assert.equal(n.index, 1); assert.equal(n.overdueDays, 3); assert.equal(n.isDue, true);
});
test('full sequence ends with no next step', () => {
  let r: any = markSent(base, 0, '2026-11-10'); r = markSent(r, 1, '2026-11-13'); r = markSent(r, 2, '2026-11-17'); r = markSent(r, 3, '2026-11-24');
  assert.equal(r.next_followup, null);
});
test('replied stops follow-ups', () => {
  const r: any = markSent(base, 0, '2026-11-10'); const s = setStage(r, 'Replied');
  assert.equal(isStopped(s), true); assert.equal(s.next_followup, null);
});
const P: any = { company_name: 'Acme', industry: 'Retail', contact_name: 'Sam Lee', job_title: 'Owner', email1: '', linkedin_url: '', phone: '', city: '', country: '', notes: '' };
const A: any = { score: 70, priority: 'HIGH', summary: 's', verified: ['v'], inferred: [], unknown: [], opportunities: [
  { name: 'No online booking', service: 'Online booking flow', why: 'w', basis: 'Verified', weight: 20 },
  { name: 'No chat option', service: 'Chat automation', why: 'w', basis: 'Verified', weight: 14 },
  { name: 'No analytics', service: 'Analytics setup', why: 'w', basis: 'Verified', weight: 10 }] };
test('combined email lists several opportunities', () => {
  const d = draftOutreach(P, A, { name: 'Jo', company: 'Co' }, { lead: '__all' });
  assert.match(d.body, /No online booking/); assert.match(d.body, /No chat option/); assert.match(d.subject, /few ideas/);
});
test('single lead and short length', () => {
  const d = draftOutreach(P, A, { name: 'Jo', company: 'Co' }, { lead: 'No chat option', length: 'Short' });
  assert.match(d.body, /no chat option/i); assert.doesNotMatch(d.body, /quick to put in place/);
});
test('proposal has sections and html escapes', () => {
  const md = proposalMd({ ...P, website: '', analysis: A, research: null }, { name: 'Jo', company: 'Co' }, '2026-11-10');
  assert.match(md, /## 3\. Proposed work/); assert.match(md, /Date: 2026-11-10/);
  assert.match(proposalHtml('# <b>x</b>'), /&lt;b&gt;/);
});

import { analyze } from '../lib/analyze';
test('catalog hides opportunities the user does not sell and renames the rest', () => {
  const research: any = { status: 'Completed', openedUrl: 'https://a.com', pages: [{}, {}], title: 't', description: '', social: [], emails: [], signals: { https: false, mobileViewport: true, booking: true, liveChat: true, analytics: true, contactForm: true, structuredData: true, blog: true } };
  const all = analyze(P, research);
  assert.ok(all.opportunities.some((o: any) => o.category === 'website'));
  const some = analyze(P, research, [{ name: 'My Secure Sites', category: 'website', active: true }, { name: 'SEO', category: 'seo', active: false }]);
  assert.ok(some.opportunities.every((o: any) => o.service === 'My Secure Sites'));
  assert.ok(some.notes.length > 0); assert.ok(some.breakdown.gaps > 0);
});
