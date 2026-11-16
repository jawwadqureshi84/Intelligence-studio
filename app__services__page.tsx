'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { CATEGORIES, DEFAULT_SERVICES } from '@/lib/catalog';

type S = { id: string; name: string; category: string; pitch: string; active: boolean };
export default function Services() {
  const sb = useMemo(() => supabaseBrowser(), []); const [rows, setRows] = useState<S[]>([]), [msg, setMsg] = useState(''), [ready, setReady] = useState(false);
  const [nw, setNw] = useState({ name: '', category: 'website', pitch: '' });
  async function load() {
    let { data, error } = await sb.from('services').select('*').order('created_at');
    if (error) { setMsg(error.message); setReady(true); return; }
    if (!data?.length) { await sb.from('services').insert(DEFAULT_SERVICES.map(s => ({ ...s }))); ({ data } = await sb.from('services').select('*').order('created_at')); }
    setRows((data as S[]) || []); setReady(true);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line
  async function patch(id: string, p: Partial<S>) { setRows(rows.map(r => (r.id === id ? { ...r, ...p } : r))); const { error } = await sb.from('services').update(p).eq('id', id); setMsg(error ? error.message : 'Saved.'); }
  async function add() { if (!nw.name.trim()) return; const { error } = await sb.from('services').insert({ ...nw, name: nw.name.trim() }); setMsg(error ? error.message : 'Added.'); setNw({ name: '', category: 'website', pitch: '' }); load(); }
  async function del(id: string) { const { error } = await sb.from('services').delete().eq('id', id); setMsg(error ? error.message : 'Removed.'); load(); }
  async function reset() { await sb.from('services').delete().not('id', 'is', null); await sb.from('services').insert(DEFAULT_SERVICES.map(s => ({ ...s }))); setMsg('Defaults restored.'); load(); }
  return <main><header className="top"><h1>Services</h1><button onClick={reset}>Restore defaults</button></header>
    <p className="mut">The services you sell. When a website gap matches a category, the prospect is pitched your service by name. Findings for a category you switch off are hidden on the next research run.</p>
    {msg && <p role="status">{msg}</p>}
    <div className="card wrap">{!ready ? <p className="mut">Loading…</p> : <table><thead><tr><th>On</th><th>Service</th><th>Matches</th><th>One-line pitch</th><th /></tr></thead><tbody>
      {rows.map(r => <tr key={r.id}><td><input type="checkbox" style={{ width: 'auto' }} checked={r.active} aria-label={`Offer ${r.name}`} onChange={e => patch(r.id, { active: e.target.checked })} /></td>
        <td><input defaultValue={r.name} onBlur={e => e.target.value.trim() && e.target.value !== r.name && patch(r.id, { name: e.target.value.trim() })} aria-label="Service name" /></td>
        <td><select value={r.category} onChange={e => patch(r.id, { category: e.target.value })}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
        <td><input defaultValue={r.pitch} onBlur={e => e.target.value !== r.pitch && patch(r.id, { pitch: e.target.value })} aria-label="Pitch" /></td><td><button onClick={() => del(r.id)}>Remove</button></td></tr>)}</tbody></table>}</div>
    <div className="card"><h2>Add a service</h2><div className="row"><input style={{ maxWidth: 260 }} placeholder="Service name" value={nw.name} onChange={e => setNw({ ...nw, name: e.target.value })} aria-label="New service name" />
      <select value={nw.category} onChange={e => setNw({ ...nw, category: e.target.value })}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input className="grow" placeholder="One-line pitch (optional)" value={nw.pitch} onChange={e => setNw({ ...nw, pitch: e.target.value })} aria-label="New service pitch" /><button className="primary" onClick={add} disabled={!nw.name.trim()}>Add</button></div></div></main>;
}
