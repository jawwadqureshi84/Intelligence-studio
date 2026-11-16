import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { researchSite, searchSocial } from '@/lib/reader';
import { analyze, draftOutreach, aiPolish } from '@/lib/analyze';

export const maxDuration = 60;

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { id, sender: senderIn } = await req.json().catch(() => ({}));
  const { data: prof } = await sb.from('profiles').select('sender_name,sender_company').maybeSingle();
  const sender = { name: senderIn?.name || prof?.sender_name || '', company: senderIn?.company || prof?.sender_company || '' };
  if (!id || typeof id !== 'string') return NextResponse.json({ error: 'Missing prospect id' }, { status: 400 });

  const { data: p, error } = await sb.from('prospects').select('*').eq('id', id).single();
  if (error || !p) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

  const limit = Number(process.env.DAILY_RESEARCH_LIMIT || 50);
  const { data: allowed } = await sb.rpc('bump_research', { max_runs: limit });
  if (!allowed) return NextResponse.json({ error: `Daily research limit (${limit}) reached. Try again tomorrow.` }, { status: 429 });

  const social = await searchSocial(p.company_name, p.city);
  const research = await researchSite(p.website, social);
  const { data: svc } = await sb.from('services').select('name,category,active');
  const a = analyze(p, research, svc && svc.length ? svc : undefined);
  const draft = await aiPolish(p, a, research, draftOutreach(p, a, { name: String(sender?.name || '').slice(0, 80), company: String(sender?.company || '').slice(0, 80) }, { lead: p.lead_opp, tone: p.tone, length: p.length }));

  const patch = {
    research, research_status: research.status, researched_at: research.researchedAt, analysis: a, score: a.score, priority: a.priority,
    ...(p.review_status === 'Draft' ? { email_subject: draft.subject, email_body: draft.body, linkedin_message: draft.linkedin } : {}),
    phone: p.phone || research.phones[0] || '', email1: p.email1 || research.emails[0] || '',
    linkedin_url: p.linkedin_url || research.social.find(s => s.network === 'LinkedIn' && s.source === 'website')?.url || '',
  };
  const { error: upErr } = await sb.from('prospects').update(patch).eq('id', id);
  if (upErr) return NextResponse.json({ error: 'Could not save results' }, { status: 500 });
  return NextResponse.json({ ok: true, status: research.status, score: a.score, aiDraft: draft.ai });
}
