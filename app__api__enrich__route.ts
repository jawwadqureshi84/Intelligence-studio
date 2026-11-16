import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { parseTarget } from '@/lib/safe-url';

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const key = process.env.APOLLO_API_KEY;
  if (!key) return NextResponse.json({ error: 'Apollo is not connected. Add APOLLO_API_KEY in Vercel (Settings, Environment Variables) and redeploy.' }, { status: 400 });
  const { id, confirm } = await req.json().catch(() => ({}));
  if (confirm !== true) return NextResponse.json({ error: 'Confirmation required: Apollo lookups can use your Apollo credits.' }, { status: 400 });
  const { data: p } = await sb.from('prospects').select('id, website').eq('id', String(id)).single();
  if (!p) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const t = parseTarget(p.website); if (!t) return NextResponse.json({ error: 'This prospect has no usable website address to look up.' }, { status: 400 });
  const { data: ok } = await sb.rpc('bump_research', { max_runs: Number(process.env.DAILY_RESEARCH_LIMIT || 50) });
  if (!ok) return NextResponse.json({ error: 'Daily limit reached.' }, { status: 429 });
  try {
    const domain = t.hostname.replace(/^www\./, '');
    const res = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`, { headers: { 'x-api-key': key, accept: 'application/json', 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return NextResponse.json({ error: `Apollo returned ${res.status}. Check the key and your plan.` }, { status: 502 });
    const o = ((await res.json()) as any).organization;
    if (!o) return NextResponse.json({ error: 'Apollo has no record for this domain.' }, { status: 404 });
    const e = { source: 'Apollo', fetchedAt: new Date().toISOString(), name: o.name || '', industry: o.industry || '', employees: o.estimated_num_employees ?? null, founded: o.founded_year ?? null, phone: o.phone || o.primary_phone?.number || '', linkedin: o.linkedin_url || '', description: String(o.short_description || '').slice(0, 400), location: [o.city, o.state, o.country].filter(Boolean).join(', '), technologies: (o.technology_names || []).slice(0, 15) };
    const { error } = await sb.from('prospects').update({ enrichment: e }).eq('id', p.id);
    if (error) return NextResponse.json({ error: 'Could not save Apollo data' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Apollo request failed or timed out.' }, { status: 502 }); }
}
