'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useSender } from '@/lib/sender';

type P = Record<string, any>;
const COLS: [string, string][] = [['Company','company_name'],['Contact','contact_name'],['Phone Number','phone'],['Email 1','email1'],['Email 2','email2'],['Email 3','email3'],['LinkedIn Profile','linkedin_url'],['Website','website'],['Industry','industry'],['Score','score'],['Priority','priority'],['Research Status','research_status'],['Email Subject','email_subject'],['Email Body','email_body'],['LinkedIn Message','linkedin_message'],['Review Status','review_status'],['Outreach Stage','outreach_stage'],['Next Follow-up','next_followup']];

export default function Home() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [rows, setRows] = useState<P[]>([]), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [q, setQ] = useState('');
  const [sender, setSender] = useSender();
  const [sel, setSel] = useState<Set<string>>(new Set()), [fp, setFp] = useState(''), [fr, setFr] = useState(''), [confirmDel, setConfirmDel] = useState(false);
  
  async function load() { const { data, error } = await sb.from('prospects').select('*').order('created_at', { ascending: false }).limit(1000); if (error) setMsg(error.message); else setRows(data || []); }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function research(id: string) {
    const r = await fetch('/api/research', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, sender }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Research failed'); return j;
  }
  async function researchAll(ids: string[]) {
    setBusy(true); let ok = 0;
    for (const id of ids) { try { setMsg(`Researching ${ok + 1} of ${ids.length}…`); await research(id); ok++; } catch (e: any) { setMsg(e.message); break; } }
    setBusy(false); if (ok === ids.length) setMsg(`Researched ${ok} prospect${ok === 1 ? '' : 's'}.`); load();
  }
  const shown = rows.filter(p => (!q || [p.company_name, p.contact_name, p.industry, p.email1, p.email2, p.email3, p.phone, p.city, p.country].join(' ').toLowerCase().includes(q.toLowerCase())) && (!fp || p.priority === fp) && (!fr || p.review_status === fr));
  const selIds = [...sel].filter(id => rows.some(r => r.id === id));
  const today = new Date().toISOString().slice(0, 10);
  const stats = { total: rows.length, done: rows.filter(p => p.research_status === 'Completed' || p.research_status === 'Partial').length, hot: rows.filter(p => p.priority === 'HOT' || p.priority === 'HIGH').length, due: rows.filter(p => p.next_followup && p.next_followup <= today).length };
  async function bulk(patch: P) { setBusy(true); const { error } = await sb.from('prospects').update(patch).in('id', selIds); setBusy(false); setMsg(error ? error.message : `Updated ${selIds.length}.`); load(); }
  async function bulkDelete() { if (!confirmDel) { setConfirmDel(true); return; } setBusy(true); const { error } = await sb.from('prospects').delete().in('id', selIds); setBusy(false); setConfirmDel(false); setSel(new Set()); setMsg(error ? error.message : `Deleted ${selIds.length}.`); load(); }
  const pending = shown.filter(p => p.research_status === 'Pending').map(p => p.id);

  return <main>
    <header className="top"><h1>Prospect Intelligence Studio</h1>
      <div className="row"><Link className="btn" href="/export">Export</Link></div></header>
    <div className="card"><div className="row">
      <Link className="btn primary" href="/import">Import prospects</Link>
      <button disabled={busy || !pending.length} onClick={() => researchAll(pending)}>Research all pending ({pending.length})</button>
      <input style={{ maxWidth: 240 }} placeholder="Search" value={q} onChange={e => setQ(e.target.value)} aria-label="Search prospects" />
      <span className="grow" />
      <input style={{ maxWidth: 170 }} placeholder="Your name" value={sender.name} onChange={e => setSender({ ...sender, name: e.target.value })} aria-label="Your name" />
      <input style={{ maxWidth: 170 }} placeholder="Your company" value={sender.company} onChange={e => setSender({ ...sender, company: e.target.value })} aria-label="Your company" /></div>
      <p className="mut" style={{ margin: '8px 0 0' }}>CSV columns recognised: Company, Contact, Job Title, Phone Number, Email 1, Email 2, Email 3, LinkedIn Profile, Website, Industry, Country, City, Notes.</p>
      {msg && <p role="status" style={{ margin: '8px 0 0' }}>{msg}</p>}</div>
    {rows.length > 0 && <div className="card"><div className="row"><span className="badge">Prospects <b>{stats.total}</b></span><span className="badge">Researched <b>{stats.done}</b></span><span className="badge">Hot or high <b>{stats.hot}</b></span><Link className="badge" href="/followups">Follow-ups due <b>{stats.due}</b></Link><span className="grow" /><label>Priority <select value={fp} onChange={e => setFp(e.target.value)}><option value="">All</option>{['HOT', 'HIGH', 'MEDIUM', 'LOW'].map(x => <option key={x}>{x}</option>)}</select></label> <label>Review <select value={fr} onChange={e => setFr(e.target.value)}><option value="">All</option>{['Draft', 'Reviewed', 'Approved', 'Rejected'].map(x => <option key={x}>{x}</option>)}</select></label></div>
      <div className="row" style={{ marginTop: 10 }} aria-label="Priority mix">{(['HOT', 'HIGH', 'MEDIUM', 'LOW'] as const).map(k => { const n = rows.filter(p => p.priority === k).length; return <span key={k} className="grow" style={{ minWidth: 120 }}><span className="mut" style={{ fontSize: 12 }}>{k} {n}</span><span style={{ display: 'block', height: 8, borderRadius: 4, background: 'var(--line)' }}><span style={{ display: 'block', height: 8, borderRadius: 4, background: 'var(--brand)', width: `${rows.length ? Math.round((n / rows.length) * 100) : 0}%` }} /></span></span>; })}</div></div>}
    {selIds.length > 0 && <div className="card"><div className="row"><b>{selIds.length} selected</b><button disabled={busy} onClick={() => researchAll(selIds)}>Research selected</button><button disabled={busy} onClick={() => bulk({ review_status: 'Reviewed' })}>Mark reviewed</button><button disabled={busy} onClick={() => bulk({ review_status: 'Approved' })}>Approve</button><button disabled={busy} onClick={() => bulk({ review_status: 'Rejected' })}>Reject</button><button disabled={busy} onClick={bulkDelete}>{confirmDel ? 'Really delete?' : 'Delete'}</button><button onClick={() => { setSel(new Set()); setConfirmDel(false); }}>Clear</button></div></div>}
    <div className="card wrap">{!rows.length ? <p className="mut">No prospects yet. Import a CSV to start.</p> :
      <table><thead><tr><th><input type="checkbox" aria-label="Select all" checked={shown.length > 0 && shown.every(p => sel.has(p.id))} onChange={e => setSel(e.target.checked ? new Set(shown.map(p => p.id)) : new Set())} /></th><th>Company</th><th>Contact details</th><th>Website</th><th>Score</th><th>Research</th><th /></tr></thead><tbody>
        {shown.map(p => <tr key={p.id}>
          <td><input type="checkbox" aria-label={`Select ${p.company_name}`} checked={sel.has(p.id)} onChange={e => { const n = new Set(sel); e.target.checked ? n.add(p.id) : n.delete(p.id); setSel(n); }} /></td>
          <td><Link href={`/prospect/${p.id}`}><b>{p.company_name}</b></Link><div className="mut">{p.industry}</div></td>
          <td>{p.contact_name}<div className="mut">{[p.phone, p.email1, p.email2, p.email3].filter(Boolean).join(' · ')}</div>{p.linkedin_url && <a href={/^https?:/.test(p.linkedin_url) ? p.linkedin_url : 'https://' + p.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn profile</a>}</td>
          <td>{p.website ? <a href={/^https?:/.test(p.website) ? p.website : 'https://' + p.website} target="_blank" rel="noopener noreferrer">{p.website.replace(/^https?:\/\//, '')}</a> : <span className="mut">None</span>}</td>
          <td>{p.score != null ? <><b>{p.score}</b> <span className={`badge b-${p.priority}`}>{p.priority}</span></> : <span className="mut">—</span>}</td>
          <td><span className="badge">{p.research_status}</span></td>
          <td><button disabled={busy} onClick={async () => { setBusy(true); setMsg(`Researching ${p.company_name}…`); try { await research(p.id); setMsg(`Done: ${p.company_name}`); } catch (e: any) { setMsg(e.message); } setBusy(false); load(); }}>{p.research_status === 'Pending' ? 'Research' : 'Re-research'}</button></td></tr>)}
      </tbody></table>}</div>
  </main>;
}
