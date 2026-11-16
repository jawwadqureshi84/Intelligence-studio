'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function Settings() {
  const sb = useMemo(() => supabaseBrowser(), []); const [v, setV] = useState({ sender_name: '', sender_company: '', default_tone: 'Professional', default_length: 'Standard' }), [msg, setMsg] = useState(''), [email, setEmail] = useState('');
  useEffect(() => { (async () => { const { data: u } = await sb.auth.getUser(); setEmail(u.user?.email || ''); const { data } = await sb.from('profiles').select('*').maybeSingle(); if (data) setV({ sender_name: data.sender_name, sender_company: data.sender_company, default_tone: data.default_tone, default_length: data.default_length }); })(); }, [sb]);
  async function save() {
    const { data: u } = await sb.auth.getUser(); if (!u.user) return setMsg('Please sign in again.');
    const { error } = await sb.from('profiles').upsert({ user_id: u.user.id, ...v, updated_at: new Date().toISOString() });
    if (!error) { try { localStorage.setItem('pis-sender', JSON.stringify({ name: v.sender_name, company: v.sender_company })); } catch {} }
    setMsg(error ? error.message : 'Saved.');
  }
  return <main style={{ maxWidth: 560 }}><header className="top"><h1>Settings</h1></header>
    <div className="card"><h2>Your sign-off</h2><p className="mut">Used in email and LinkedIn drafts and proposal outlines.</p>
      <label>Your name<input value={v.sender_name} onChange={e => setV({ ...v, sender_name: e.target.value })} /></label><br /><br />
      <label>Your company<input value={v.sender_company} onChange={e => setV({ ...v, sender_company: e.target.value })} /></label><br /><br />
      <div className="row"><label>Default tone <select value={v.default_tone} onChange={e => setV({ ...v, default_tone: e.target.value })}>{['Professional', 'Friendly', 'Direct'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Default length <select value={v.default_length} onChange={e => setV({ ...v, default_length: e.target.value })}>{['Short', 'Standard'].map(x => <option key={x}>{x}</option>)}</select></label></div>
      <p className="mut">Defaults apply to prospects you import from now on.</p><button className="primary" onClick={save}>Save</button> {msg && <span role="status">{msg}</span>}</div>
    <div className="card"><h2>Account</h2><p>Signed in as <b>{email}</b></p><button onClick={async () => { await sb.auth.signOut(); window.location.href = '/login'; }}>Sign out</button></div></main>;
}
