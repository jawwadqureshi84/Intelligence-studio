import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const maxDuration = 60;

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ reply: 'The assistant is switched off because no ANTHROPIC_API_KEY is set on the server. Add it in Vercel (Settings, Environment Variables) and redeploy.' });
  const body = await req.json().catch(() => ({}));
  const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-12).map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 3000) })).filter((m: any) => m.content);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  const { data: ok } = await sb.rpc('bump_chat', { max_chats: Number(process.env.DAILY_CHAT_LIMIT || 100) });
  if (!ok) return NextResponse.json({ reply: 'Daily assistant limit reached. Try again tomorrow.' });

  let ctx = 'No prospect is open.';
  if (typeof body.prospectId === 'string') {
    const { data: p } = await sb.from('prospects').select('*').eq('id', body.prospectId).single();
    if (p) {
      const a = p.analysis;
      ctx = [`Open prospect: ${p.company_name} (${p.industry || 'industry unknown'}), ${p.city} ${p.country}`, `Contact: ${p.contact_name} ${p.job_title}`, `Website: ${p.website || 'none'}`, `Research status: ${p.research_status}`,
        a ? `Score ${p.score} (${p.priority}). Verified: ${a.verified.join(' | ')}. Unknown: ${a.unknown.join(' | ')}. Opportunities: ${a.opportunities.map((o: any) => `${o.name} [${o.basis}] -> ${o.service}`).join('; ')}` : 'Not analysed yet.',
        p.research ? `Site headings: ${(p.research.headings || []).slice(0, 10).join(' | ')}. Social: ${(p.research.social || []).map((s: any) => s.network).join(', ') || 'none found'}` : '',
        p.email_body ? `Current email draft:\nSubject: ${p.email_subject}\n${String(p.email_body).slice(0, 1500)}` : ''].filter(Boolean).join('\n');
    }
  }
  try {
    const base = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
    const res = await fetch(`${base}/v1/messages`, { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 900,
        system: `You are a sales assistant inside a prospect research tool. Help the user plan outreach, rewrite drafts and prepare for calls. Use only the facts below about the prospect. If something is not in the facts, say it is unknown rather than guessing. Never claim you sent or changed anything; the user copies text themselves. Be concise.\n\nCONTEXT:\n${ctx}`, messages: msgs }) });
    if (!res.ok) return NextResponse.json({ reply: `The assistant could not answer (error ${res.status}). Check the API key and model name.` });
    const j: any = await res.json();
    return NextResponse.json({ reply: String(j.content?.[0]?.text || 'No answer returned.') });
  } catch { return NextResponse.json({ reply: 'The assistant timed out. Please try again.' }); }
}
