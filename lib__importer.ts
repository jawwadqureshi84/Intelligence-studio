import { FIELDS, autoMap, type Field } from './csv';

export const LABELS: Record<Field, string> = {
  company_name: 'Company name', contact_name: 'Contact name', job_title: 'Job title', phone: 'Phone number', email1: 'Email 1', email2: 'Email 2', email3: 'Email 3',
  linkedin_url: 'LinkedIn profile link', website: 'Website', industry: 'Industry', country: 'Country', city: 'City', notes: 'Notes',
};
export type Mapping = Partial<Record<Field, number>>;
export type Rec = Record<Field, string> & { flags: string[] };

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

/** Client-safe website check. Returns a cleaned https URL or null. Never fetches anything. */
export function normUrl(raw: string): string | null {
  const t = (raw || '').trim(); if (!t || /\s/.test(t)) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : 'https://' + t);
    if (!/^https?:$/.test(u.protocol) || u.username || u.password || !u.hostname.includes('.')) return null;
    return u.toString().replace(/\/$/, '');
  } catch { return null; }
}
const coKey = (name: string, site: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '') + '|' + (normUrl(site) || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();

export function build(rows: string[][], map: Mapping, existing: { company_name: string; website: string; email1: string }[], skipDuplicates: boolean) {
  const val = (r: string[], f: Field) => (map[f] == null ? '' : String(r[map[f]!] ?? '').trim());
  const seenCo = new Set(existing.map(e => coKey(e.company_name, e.website))), seenEm = new Set(existing.filter(e => e.email1).map(e => e.email1.toLowerCase()));
  const out = { records: [] as Rec[], skipped: [] as { row: number; reason: string }[], stats: { total: rows.length, noWebsite: 0, badWebsite: 0, badEmail: 0, dupCompany: 0, dupEmail: 0, noCompany: 0 } };
  rows.forEach((r, i) => {
    const rec = Object.fromEntries(FIELDS.map(f => [f, val(r, f)])) as Record<Field, string>; const flags: string[] = [];
    if (!rec.company_name) { out.stats.noCompany++; out.skipped.push({ row: i + 2, reason: 'No company name' }); return; }
    if (!rec.website) { flags.push('No website'); out.stats.noWebsite++; }
    else { const u = normUrl(rec.website); if (!u) { flags.push('Invalid website'); out.stats.badWebsite++; rec.notes = [rec.notes, `Original website value: ${rec.website}`].filter(Boolean).join(' | '); rec.website = ''; } else rec.website = u; }
    for (const k of ['email1', 'email2', 'email3'] as const) if (rec[k] && !isEmail(rec[k])) { flags.push(`Invalid ${k.replace('email', 'email ')}`); if (k === 'email1') out.stats.badEmail++; }
    let dup = false; const ck = coKey(rec.company_name, rec.website);
    if (seenCo.has(ck)) { flags.push('Duplicate company'); out.stats.dupCompany++; dup = true; }
    if (rec.email1 && seenEm.has(rec.email1.toLowerCase())) { flags.push('Duplicate email'); out.stats.dupEmail++; dup = true; }
    if (dup && skipDuplicates) { out.skipped.push({ row: i + 2, reason: 'Duplicate of an existing or earlier row' }); return; }
    seenCo.add(ck); if (rec.email1) seenEm.add(rec.email1.toLowerCase());
    out.records.push({ ...rec, flags });
  });
  return out;
}
export { autoMap };
