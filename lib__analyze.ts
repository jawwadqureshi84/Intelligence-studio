import type { Research } from './reader';

export type Opportunity = { name: string; service: string; why: string; basis: 'Verified' | 'Inferred'; weight: number };
export type Analysis = {
  score: number; priority: 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW'; summary: string;
  opportunities: Opportunity[]; verified: string[]; inferred: string[]; unknown: string[];
};
type P = { company_name: string; industry: string; contact_name: string; job_title: string; email1: string; linkedin_url: string; phone: string; city: string; country: string; notes: string };

export const priorityOf = (s: number) => (s >= 80 ? 'HOT' : s >= 60 ? 'HIGH' : s >= 40 ? 'MEDIUM' : 'LOW') as Analysis['priority'];

export function analyze(p: P, r: Research | null): Analysis {
  const verified: string[] = [], inferred: string[] = [], unknown: string[] = [], opps: Opportunity[] = [];
  const add = (o: Opportunity) => opps.push(o);
  if (p.contact_name) verified.push(`Contact: ${p.contact_name}${p.job_title ? ', ' + p.job_title : ''} (from your spreadsheet)`);
  const ok = r && r.status !== 'Failed';
  if (!ok) {
    unknown.push('Website content was not read, so website-based findings are not available.');
    if (p.industry) inferred.push(`Typical needs for ${p.industry} businesses are suggestions only, not findings.`);
    add({ name: 'Website review needed', service: 'Website audit', why: 'The website could not be read. A manual review would confirm what is possible.', basis: 'Inferred', weight: 10 });
  } else {
    const s = r!.signals;
    verified.push(`Website opened: ${r!.openedUrl} (${r!.pages.length} page${r!.pages.length > 1 ? 's' : ''} read)`);
    if (r!.title) verified.push(`Site title: ${r!.title}`);
    if (r!.description) verified.push(`Site description: ${r!.description}`);
    if (r!.social.length) verified.push(`Social profiles found: ${r!.social.map(x => x.network + (x.source === 'search' ? ' (search match, check it)' : '')).join(', ')}`);
    if (r!.emails.length) verified.push(`Public email on site: ${r!.emails[0]}`);
    if (!s.https) add({ name: 'Site is not secure (no HTTPS)', service: 'Website refresh', why: 'The site loaded without HTTPS, which browsers flag to visitors.', basis: 'Verified', weight: 18 });
    if (!s.mobileViewport) add({ name: 'No mobile viewport tag found', service: 'Website refresh', why: 'The page did not declare a mobile viewport, which often means a poor phone experience.', basis: 'Verified', weight: 16 });
    if (!s.booking && !s.ecommerce) add({ name: 'No online booking or ordering found', service: 'Online booking or ordering flow', why: 'No booking or checkout wording was found on the pages read.', basis: 'Verified', weight: 20 });
    if (!s.liveChat && !s.whatsapp) add({ name: 'No chat or messaging option found', service: 'Chat / WhatsApp automation', why: 'No chat widget or WhatsApp link was found.', basis: 'Verified', weight: 14 });
    if (!s.analytics) add({ name: 'No analytics tracking found', service: 'Analytics and conversion tracking', why: 'No common analytics scripts were detected.', basis: 'Verified', weight: 10 });
    if (!s.contactForm) add({ name: 'No contact form found', service: 'Lead capture and CRM follow-up', why: 'No form tag was found on the pages read.', basis: 'Verified', weight: 12 });
    if (!s.structuredData) add({ name: 'No structured data (SEO) found', service: 'SEO setup', why: 'No schema.org JSON-LD was found.', basis: 'Verified', weight: 8 });
    if (!r!.description) add({ name: 'Missing meta description', service: 'SEO setup', why: 'The home page has no meta description.', basis: 'Verified', weight: 6 });
    if (!s.blog) add({ name: 'No blog or news section found', service: 'Content marketing', why: 'No blog-like page was linked from the home page.', basis: 'Verified', weight: 5 });
    if (!r!.social.length) add({ name: 'No social profiles linked', service: 'Social media setup', why: 'The site links to no social profiles.', basis: 'Verified', weight: 8 });
    if (s.portal) inferred.push('Login wording suggests a customer or member area exists.');
    unknown.push('Revenue, team size, ad spend and internal tools are not visible from public pages.');
    if (r!.status === 'Partial') unknown.push('Only the home page was read, so findings about other pages may be missing.');
  }
  opps.sort((a, b) => b.weight - a.weight);
  const reach = (p.email1 ? 6 : 0) + (p.linkedin_url ? 4 : 0) + (p.phone ? 2 : 0) + (p.contact_name ? 3 : 0);
  const gap = Math.min(65, opps.reduce((n, o) => n + o.weight, 0));
  const base = ok ? 20 : 10;
  const score = Math.max(0, Math.min(100, Math.round(base + gap + reach * 1.0)));
  const summary = ok
    ? `${p.company_name}: ${r!.description || r!.title || 'website read'}. ${opps.length} gap${opps.length === 1 ? '' : 's'} found on the pages read.`
    : `${p.company_name}: website not read. Score is based on spreadsheet details only and is low confidence.`;
  return { score, priority: priorityOf(score), summary, opportunities: opps.slice(0, 6), verified, inferred, unknown };
}

export function draftOutreach(p: P, a: Analysis, sender: { name: string; company: string }) {
  const first = (p.contact_name || '').split(/\s+/)[0];
  const top = a.opportunities.find(o => o.basis === 'Verified') || a.opportunities[0];
  const hello = first ? `Hi ${first},` : 'Hello,';
  const obs = top && top.basis === 'Verified' ? `While looking at ${p.company_name}'s website, I noticed: ${top.name.charAt(0).toLowerCase() + top.name.slice(1)}.` : `I had a look at ${p.company_name} and wanted to reach out.`;
  const sign = `${sender.name || '[Your name]'}${sender.company ? '\n' + sender.company : ''}`;
  return {
    subject: top ? `A quick idea for ${p.company_name}: ${top.service.toLowerCase()}` : `A quick idea for ${p.company_name}`,
    body: `${hello}\n\n${obs} ${top ? `A ${top.service.toLowerCase()} could help ${p.company_name} turn more visitors into enquiries.` : ''}\n\nWould a short outline of how this could work be useful? Happy to send one, no obligation.\n\n${sign}`,
    linkedin: `${hello} I looked at ${p.company_name}'s site and had one idea on ${top ? top.service.toLowerCase() : 'your online presence'}. Happy to share it if useful.`,
  };
}

/** Optional AI polish. Only used when ANTHROPIC_API_KEY is set; failure falls back to the template draft. */
export async function aiPolish(p: P, a: Analysis, r: Research | null, draft: { subject: string; body: string; linkedin: string }) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return { ...draft, ai: false };
  try {
    const base = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    const facts = [...a.verified, ...(r ? [`Headings: ${r.headings.slice(0, 8).join(' | ')}`, `Excerpt: ${r.textSample.slice(0, 1200)}`] : [])].join('\n');
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, signal: AbortSignal.timeout(40_000),
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 900,
        system: 'You write short, honest B2B outreach. Use ONLY the facts provided. Never invent facts, numbers or claims about the company. Reply with JSON only: {"subject":"","body":"","linkedin":""}. Email under 120 words, LinkedIn under 50 words.',
        messages: [{ role: 'user', content: `Company: ${p.company_name}\nContact: ${p.contact_name} ${p.job_title}\nTop opportunities: ${a.opportunities.slice(0, 3).map(o => o.name + ' -> ' + o.service).join('; ')}\nFACTS:\n${facts}\n\nStarting draft:\n${draft.body}` }] }) });
    if (!res.ok) return { ...draft, ai: false };
    const j: any = await res.json(); const t = j.content?.[0]?.text || ''; const m = t.match(/\{[\s\S]*\}/);
    const o = m ? JSON.parse(m[0]) : null;
    if (o?.subject && o?.body) return { subject: String(o.subject), body: String(o.body), linkedin: String(o.linkedin || draft.linkedin), ai: true };
  } catch { /* fall back */ }
  return { ...draft, ai: false };
}
