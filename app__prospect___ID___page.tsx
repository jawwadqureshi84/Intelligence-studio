import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import Review from './review';

export default async function Prospect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: p } = await sb.from('prospects').select('*').eq('id', id).single();
  if (!p) notFound();
  const r = p.research, a = p.analysis;
  return <main>
    <p><Link href="/">← All prospects</Link></p>
    <div className="card"><h1>{p.company_name} {a && <span className={`badge b-${p.priority}`}>{p.priority} · {p.score}</span>}</h1>
      <p className="mut">{[p.industry, p.city, p.country].filter(Boolean).join(' · ')}</p>
      <p>{p.contact_name}{p.job_title && `, ${p.job_title}`}</p>
      <p className="mono">{[p.phone && `Tel ${p.phone}`, p.email1, p.email2, p.email3].filter(Boolean).join(' · ') || 'No contact details'}</p>
      {p.linkedin_url && <p><a href={/^https?:/.test(p.linkedin_url) ? p.linkedin_url : 'https://' + p.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn profile</a></p>}</div>
    {!r ? <div className="card"><p>Not researched yet. Go back and press Research.</p></div> : <>
      <div className="card"><h2>Website research — {p.research_status}</h2>
        {r.openedUrl ? <p>Opened <a href={r.openedUrl} target="_blank" rel="noopener noreferrer">{r.openedUrl}</a>, read {r.pages.length} page(s).</p> : <p className="err">The website could not be opened.</p>}
        <details><summary>Addresses tried</summary><ul>{r.tried.map((t: any, i: number) => <li key={i} className="mono">{t.url} — {t.ok ? 'opened' : t.error}</li>)}</ul></details>
        {r.notes.map((n: string, i: number) => <p key={i} className="mut">{n}</p>)}
        {r.social.length > 0 && <><h2>Social profiles</h2><ul>{r.social.map((s: any, i: number) => <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.network}</a> <span className="mut">{s.source === 'search' ? '— found by search, confirm it is the right company' : '— linked from their website'}</span></li>)}</ul></>}</div>
      <div className="grid">
        <div className="card"><h2>Verified</h2><ul>{a.verified.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul><h2>Inferred</h2><ul>{a.inferred.length ? a.inferred.map((x: string, i: number) => <li key={i}>{x}</li>) : <li className="mut">None</li>}</ul><h2>Unknown</h2><ul>{a.unknown.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
        <div className="card"><h2>Opportunities</h2><ul>{a.opportunities.map((o: any, i: number) => <li key={i}><b>{o.name}</b> → {o.service} <span className="badge">{o.basis}</span><div className="mut">{o.why}</div></li>)}</ul></div></div>
      <Review id={p.id} subject={p.email_subject} body={p.email_body} linkedin={p.linkedin_message} status={p.review_status} /></>}
  </main>;
}
