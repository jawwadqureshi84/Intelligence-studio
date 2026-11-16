'use client';
import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { FIELDS } from '@/lib/csv';
import { LABELS, autoMap, build, type Mapping } from '@/lib/importer';

export default function Import() {
  const sb = useMemo(() => supabaseBrowser(), []); const router = useRouter(); const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(''), [head, setHead] = useState<string[]>([]), [rows, setRows] = useState<string[][]>([]), [map, setMap] = useState<Mapping>({});
  const [skip, setSkip] = useState(true), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [existing, setExisting] = useState<any[]>([]);

  async function onFile(f?: File) {
    if (!f) return; setErr('');
    try {
      let matrix: string[][];
      if (/\.xlsx$/i.test(f.name)) { const { readSheet } = await import('read-excel-file/browser'); matrix = (await readSheet(f)).map(r => r.map(c => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)))); }
      else if (/\.(csv|tsv|txt)$/i.test(f.name)) matrix = await new Promise<string[][]>((ok, no) => Papa.parse<string[]>(f, { skipEmptyLines: true, complete: r => ok(r.data as string[][]), error: no }));
      else return setErr(`"${f.name}" is not supported. Use .csv, .tsv or .xlsx. For an old .xls file, open it in Excel and Save As .xlsx.`);
      matrix = matrix.filter(r => r.some(c => String(c).trim()));
      if (matrix.length < 2) return setErr('The file needs a header row and at least one prospect below it.');
      const h = matrix[0].map((c, i) => String(c).trim() || `Column ${i + 1}`);
      setName(f.name); setHead(h); setRows(matrix.slice(1).map(r => h.map((_, i) => String(r[i] ?? '').trim()))); setMap(autoMap(h));
      const { data } = await sb.from('prospects').select('company_name,website,email1').limit(5000); setExisting(data || []);
    } catch { setErr(`"${f.name}" could not be read. It may be corrupted or password protected.`); }
  }
  const res = useMemo(() => (rows.length ? build(rows, map, existing, skip) : null), [rows, map, existing, skip]);
  async function go() {
    if (!res || !res.records.length) return; setBusy(true); setErr('');
    const { data: prof } = await sb.from('profiles').select('default_tone,default_length').maybeSingle();
    const recs = res.records.map(({ flags, ...r }) => ({ ...r, tone: prof?.default_tone || 'Professional', length: prof?.default_length || 'Standard' }));
    for (let i = 0; i < recs.length; i += 200) { const { error } = await sb.from('prospects').insert(recs.slice(i, i + 200)); if (error) { setBusy(false); return setErr(error.message); } }
    router.push('/');
  }
  return <main><header className="top"><h1>Import prospects</h1></header>
    <div className="card"><input ref={input} type="file" accept=".csv,.tsv,.txt,.xlsx" hidden onChange={e => onFile(e.target.files?.[0])} />
      <div className="row"><button className="primary" onClick={() => input.current?.click()}>{name ? 'Choose another file' : 'Choose file'}</button><span className="mut">{name ? `${name}: ${rows.length} rows` : '.csv, .tsv or .xlsx. The first row must contain column names.'}</span></div>
      {err && <p className="err" role="alert">{err}</p>}
      <p className="mut" style={{ marginBottom: 0 }}>Recognised: {FIELDS.map(f => LABELS[f]).join(', ')}.</p></div>
    {res && <>
      <div className="card wrap"><h2>Match your columns</h2><table><thead><tr><th>Prospect field</th><th>Spreadsheet column</th><th>Example</th></tr></thead><tbody>
        {FIELDS.map(f => <tr key={f}><td>{LABELS[f]}{f === 'company_name' && ' *'}</td><td><select value={map[f] ?? ''} onChange={e => { const m = { ...map }; if (e.target.value === '') delete m[f]; else m[f] = Number(e.target.value); setMap(m); }}><option value="">Not in my file</option>{head.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></td><td className="mut">{map[f] != null ? rows.find(r => r[map[f]!])?.[map[f]!] || '' : ''}</td></tr>)}</tbody></table></div>
      <div className="card"><h2>Check before importing</h2>
        <div className="row"><span className="badge">Ready <b>{res.records.length}</b></span><span className="badge">Skipped <b>{res.skipped.length}</b></span><span className="badge">No website <b>{res.stats.noWebsite}</b></span><span className="badge">Invalid website <b>{res.stats.badWebsite}</b></span><span className="badge">Invalid email <b>{res.stats.badEmail}</b></span><span className="badge">Duplicate company <b>{res.stats.dupCompany}</b></span><span className="badge">Duplicate email <b>{res.stats.dupEmail}</b></span></div>
        <p><label><input type="checkbox" style={{ width: 'auto' }} checked={skip} onChange={e => setSkip(e.target.checked)} /> Skip duplicates (companies or emails already in your list or earlier in this file)</label></p>
        {map.company_name == null && <p className="err">Choose which column holds the company name.</p>}
        {res.skipped.slice(0, 5).map(s => <p key={s.row} className="mut" style={{ margin: 0 }}>Row {s.row}: {s.reason}</p>)}
        <div className="wrap"><table><thead><tr><th>Company</th><th>Contact</th><th>Email 1</th><th>Website</th><th>Flags</th></tr></thead><tbody>{res.records.slice(0, 8).map((r, i) => <tr key={i}><td>{r.company_name}</td><td>{r.contact_name}</td><td>{r.email1}</td><td>{r.website}</td><td>{r.flags.map(f => <span key={f} className="badge" style={{ marginRight: 4 }}>{f}</span>)}</td></tr>)}</tbody></table></div>
        <div className="row" style={{ marginTop: 12 }}><button className="primary" disabled={busy || !res.records.length || map.company_name == null} onClick={go}>{busy ? 'Importing…' : `Import ${res.records.length} prospects`}</button></div></div></>}
  </main>;
}
