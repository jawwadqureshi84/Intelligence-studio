'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Shell() {
  const path = usePathname() || '';
  const [open, setOpen] = useState(false), [msgs, setMsgs] = useState<{ role: string; content: string }[]>([]), [txt, setTxt] = useState(''), [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  if (path.startsWith('/login')) return null;
  const pid = path.match(/^\/prospect\/([0-9a-f-]{36})/)?.[1];
  async function send() {
    const t = txt.trim(); if (!t || busy) return;
    const next = [...msgs, { role: 'user', content: t }]; setMsgs(next); setTxt(''); setBusy(true);
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: next, prospectId: pid }) });
      const j = await r.json().catch(() => ({})); setMsgs([...next, { role: 'assistant', content: j.reply || j.error || 'No answer.' }]);
    } catch { setMsgs([...next, { role: 'assistant', content: 'Network error. Try again.' }]); }
    setBusy(false); setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }
  return <>
    <nav style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 16px 0' }} className="row"><Link className="btn" href="/">Prospects</Link><Link className="btn" href="/followups">Follow-ups</Link><Link className="btn" href="/import">Import</Link><Link className="btn" href="/services">Services</Link><Link className="btn" href="/export">Export</Link><Link className="btn" href="/settings">Settings</Link></nav>
    <button className="primary" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 20 }} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Close assistant' : 'Sales assistant'}</button>
    {open && <aside role="dialog" aria-label="Sales assistant" className="card" style={{ position: 'fixed', right: 16, bottom: 64, width: 'min(380px, calc(100vw - 32px))', height: 'min(520px, 70vh)', zIndex: 20, display: 'flex', flexDirection: 'column', margin: 0 }}>
      <b>Sales assistant</b><span className="mut" style={{ fontSize: 13 }}>{pid ? 'Knows the prospect you have open.' : 'Open a prospect for prospect-specific help.'}</span>
      <div style={{ flex: 1, overflowY: 'auto', margin: '8px 0' }}>{!msgs.length && <p className="mut">Try: "Make the email shorter" or "What should I ask on the first call?"</p>}
        {msgs.map((m, i) => <p key={i} style={{ background: m.role === 'user' ? 'transparent' : 'var(--bg)', padding: 8, borderRadius: 8 }}><b>{m.role === 'user' ? 'You' : 'Assistant'}:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span></p>)}{busy && <p className="mut">Thinking…</p>}<div ref={end} /></div>
      <div className="row"><input className="grow" value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask something" aria-label="Message" /><button className="primary" disabled={busy || !txt.trim()} onClick={send}>Send</button></div></aside>}
  </>;
}
