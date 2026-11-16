'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { draftOutreach } from '@/lib/analyze';
import { SEQ, STAGES, nextStep, markSent, setStage, followDraft, today, type Pipe } from '@/lib/followups';
import { proposalMd, proposalHtml } from '@/lib/proposal';
import { useSender, download } from '@/lib/sender';

type P = Record<string, any>;
const useSave = (id: string) => {
  const router = useRouter(); const [msg, setMsg] = useState('');
  return { msg, setMsg, save: async (patch: P, ok = 'Saved.') => { const { error } = await supabaseBrowser().from('prospects').update(patch).eq('id', id); setMsg(error ? error.message : ok); if (!error) router.refresh(); } };
};
const copy = (t: string) => navigator.clipboard?.writeText(t);

export function Outreach({ p }: { p: P }) {
  const [sender, setSender] = useSender(); const { msg, save } = useSave(p.id);
  const [s, setS] = useState(p.email_subject), [b, setB] = useState(p.email_body), [l, setL] = useState(p.linkedin_message);
  const [lead, setLead] = useState(p.lead_opp || ''), [tone, setTone] = useState(p.tone), [len, setLen] = useState(p.length), [st, setSt] = useState(p.review_status);
  const [confirm, setConfirm] = useState(false);
  const edited = s !== p.email_subject || b !== p.email_body || l !== p.linkedin_message;
  function regen() {
    if (edited && !confirm) { setConfirm(true); return; }
    const d = draftOutreach(p as any, p.analysis, sender, { lead, tone, length: len });
    setS(d.subject); setB(d.body); setL(d.linkedin); setConfirm(false);
    save({ email_subject: d.subject, email_body: d.body, linkedin_message: d.linkedin, lead_opp: lead, tone, length: len, review_status: 'Draft' }, 'Draft regenerated.'); setSt('Draft');
  }
  const set = async (status: string) => { await save({ email_subject: s, email_body: b, linkedin_message: l, review_status: status }, `Saved (${status}).`); setSt(status); };
  const ops: any[] = p.analysis?.opportunities || [];
  return <div className="card"><h2>Outreach draft · <span className="badge">{st}</span></h2>
    <div className="row" style={{ marginBottom: 10 }}>
      <label>Lead with <select value={lead} onChange={e => setLead(e.target.value)}><option value="">Best opportunity</option><option value="__all">All opportunities (one combined email)</option>{ops.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}</select></label>
      <label>Tone <select value={tone} onChange={e => setTone(e.target.value)}>{['Professional', 'Friendly', 'Direct'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Length <select value={len} onChange={e => setLen(e.target.value)}>{['Short', 'Standard'].map(x => <option key={x}>{x}</option>)}</select></label>
      <button onClick={regen}>{confirm ? 'Replace my edits?' : 'Regenerate'}</button></div>
    <div className="row" style={{ marginBottom: 10 }}><input style={{ maxWidth: 200 }} placeholder="Your name" value={sender.name} onChange={e => setSender({ ...sender, name: e.target.value })} aria-label="Your name" /><input style={{ maxWidth: 200 }} placeholder="Your company" value={sender.company} onChange={e => setSender({ ...sender, company: e.target.value })} aria-label="Your company" /><span className="mut">Used in the sign-off when you regenerate.</span></div>
    <label>Subject<input value={s} onChange={e => setS(e.target.value)} /></label><br /><br />
    <label>Email<textarea rows={10} value={b} onChange={e => setB(e.target.value)} /></label><br /><br />
    <label>LinkedIn message<textarea rows={3} value={l} onChange={e => setL(e.target.value)} /></label>
    <div className="row" style={{ marginTop: 12 }}><button onClick={() => set(st)}>Save</button><button onClick={() => set('Reviewed')}>Mark reviewed</button><button className="primary" onClick={() => set('Approved')}>Approve</button><button onClick={() => set('Rejected')}>Reject</button><button onClick={() => copy(`${s}\n\n${b}`)}>Copy email</button><button onClick={() => copy(l)}>Copy LinkedIn</button></div>
    {msg && <p role="status">{msg}</p>}<p className="mut">Review every draft before sending. Nothing is sent automatically.</p></div>;
}

export function Pipeline({ p }: { p: P }) {
  const { msg, save } = useSave(p.id); const [sender] = useSender();
  const pipe: Pipe = { outreach_stage: p.outreach_stage, outreach_started: p.outreach_started, outreach_log: p.outreach_log || [] };
  const nx = nextStep(pipe); const done = new Map<number, string>((pipe.outreach_log).map(x => [x.step, x.date]));
  const [show, setShow] = useState(false);
  const draft = nx && nx.index > 0 ? followDraft(p as any, nx.index, sender) : null;
  return <div className="card"><h2>Outreach tracking · <span className="badge">{p.outreach_stage}</span></h2>
    <ol>{SEQ.map((x, i) => <li key={i}>{done.has(i) ? '✓ ' : ''}{x.label} ({x.channel}) {done.has(i) ? <span className="mut">sent {done.get(i)}</span> : pipe.outreach_started ? <span className="mut">due {new Date(Date.parse(pipe.outreach_started) + x.day * 86400000).toISOString().slice(0, 10)}</span> : <span className="mut">day {x.day}</span>}</li>)}</ol>
    {nx && <p>{nx.isDue ? <b className={nx.overdueDays ? 'err' : ''}>{nx.overdueDays ? `${nx.overdueDays} day(s) overdue: ` : 'Due today: '}</b> : 'Next: '}{nx.label} on {nx.due}</p>}
    <div className="row">
      {SEQ.map((x, i) => !done.has(i) && (i === 0 || done.has(i - 1)) && <button key={i} className="primary" onClick={() => save(markSent(pipe, i), `${x.label} marked as sent.`)}>Mark "{x.label}" sent</button>)}
      <label>Stage <select value={p.outreach_stage} onChange={e => save(setStage(pipe, e.target.value), 'Stage updated.')}>{STAGES.map(x => <option key={x}>{x}</option>)}</select></label>
      <button onClick={() => save(setStage(pipe, 'Replied'), 'Marked as replied. Follow-ups stopped.')}>They replied</button>
      {draft && <button onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'} follow-up draft</button>}</div>
    {show && draft && <div style={{ marginTop: 10 }}>{draft.subject && <p className="mono">Subject: {draft.subject}</p>}<pre>{draft.body}</pre><button onClick={() => copy((draft.subject ? draft.subject + '\n\n' : '') + draft.body)}>Copy follow-up</button></div>}
    {msg && <p role="status">{msg}</p>}<p className="mut">Replies are tracked by you: press "They replied" when someone answers. The tool does not read your inbox.</p></div>;
}

export function Extras({ p }: { p: P }) {
  const { msg, setMsg, save } = useSave(p.id); const [sender] = useSender(); const router = useRouter();
  const [c, setC] = useState({ phone: p.phone, email1: p.email1, email2: p.email2, email3: p.email3, linkedin_url: p.linkedin_url, website: p.website });
  const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false); const e = p.enrichment;
  const md = () => proposalMd(p as any, sender);
  async function enrich() {
    setBusy(true); const r = await fetch('/api/enrich', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: p.id, confirm: true }) });
    const j = await r.json().catch(() => ({})); setBusy(false); setAsk(false); setMsg(r.ok ? 'Apollo data added.' : j.error || 'Apollo lookup failed.'); if (r.ok) router.refresh();
  }
  const fields: [keyof typeof c, string][] = [['phone', 'Phone number'], ['email1', 'Email 1'], ['email2', 'Email 2'], ['email3', 'Email 3'], ['linkedin_url', 'LinkedIn profile link'], ['website', 'Website']];
  return <div className="grid">
    <div className="card"><h2>Contact details</h2>{fields.map(([k, label]) => <label key={k} style={{ display: 'block', marginBottom: 8 }}>{label}<input value={c[k]} onChange={x => setC({ ...c, [k]: x.target.value })} /></label>)}
      <button onClick={() => save(c, 'Contact details saved.')}>Save details</button></div>
    <div className="card"><h2>Proposal outline</h2><p className="mut">A draft outline built from this prospect's findings. No prices are included.</p>
      <div className="row"><button className="primary" disabled={!p.analysis} onClick={() => download(`proposal-${p.company_name.replace(/\W+/g, '-').toLowerCase()}.md`, md(), 'text/markdown')}>Download .md</button><button disabled={!p.analysis} onClick={() => download(`proposal-${p.company_name.replace(/\W+/g, '-').toLowerCase()}.html`, proposalHtml(md()), 'text/html')}>Download .html</button><button disabled={!p.analysis} onClick={() => copy(md())}>Copy</button></div>
      <h2 style={{ marginTop: 18 }}>Apollo enrichment</h2>
      {e ? <ul><li>{e.name} · {e.industry || 'industry n/a'} · {e.location || 'location n/a'}</li><li>Employees: {e.employees ?? 'n/a'} · Founded: {e.founded ?? 'n/a'}</li>{e.phone && <li>Phone: {e.phone}</li>}{e.linkedin && <li><a href={e.linkedin} target="_blank" rel="noopener noreferrer">Company LinkedIn</a></li>}{e.technologies?.length > 0 && <li>Tech: {e.technologies.join(', ')}</li>}<li className="mut">From Apollo on {String(e.fetchedAt).slice(0, 10)}. Third-party data, may be out of date.</li></ul> : <p className="mut">Not looked up.</p>}
      {!ask ? <button disabled={!p.website} onClick={() => setAsk(true)}>{e ? 'Refresh from Apollo' : 'Look up in Apollo'}</button> : <div className="row"><span>This can use Apollo credits. Continue?</span><button className="primary" disabled={busy} onClick={enrich}>{busy ? 'Looking up…' : 'Yes, look up'}</button><button onClick={() => setAsk(false)}>Cancel</button></div>}</div>
    {msg && <p role="status">{msg}</p>}</div>;
}
