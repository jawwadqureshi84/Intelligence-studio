'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { csvCell } from '@/lib/csv';
import { download } from '@/lib/sender';

const COLS: [string, string][] = [['Company', 'company_name'], ['Contact', 'contact_name'], ['Job Title', 'job_title'], ['Phone Number', 'phone'], ['Email 1', 'email1'], ['Email 2', 'email2'], ['Email 3', 'email3'], ['LinkedIn Profile', 'linkedin_url'], ['Website', 'website'], ['Industry', 'industry'], ['Country', 'country'], ['City', 'city'], ['Score', 'score'], ['Priority', 'priority'], ['Research Status', 'research_status'], ['Top Opportunity', 'top'], ['Recommended Service', 'svc'], ['Research Summary', 'summary'], ['Email Subject', 'email_subject'], ['Email Body', 'email_body'], ['LinkedIn Message', 'linkedin_message'], ['Review Status', 'review_status'], ['Outreach Stage', 'outreach_stage'], ['Next Follow-up', 'next_followup']];
export default function Export() {
  const sb = useMemo(() => supabaseBrowser(), []); const [rows, setRows] = useState<any[]>([]), [f, setF] = useState({ priority: '', review: '', researched: false }), [msg, setMsg] = useState('');
  useEffect(() => { sb.from('prospects').select('*').order('score', { ascending: false, nullsFirst: false }).limit(5000).then(({ data, error }) => error ? setMsg(error.message) : setRows(data || [])); }, [sb]);
  const list = rows.filter(p => (!f.priority || p.priority === f.priority) && (!f.review || p.review_status === f.review) && (!f.researched || p.research_status === 'Completed' || p.research_status === 'Partial'))
    .map(p => ({ ...p, top: p.analysis?.opportunities?.[0]?.name || '', svc: p.analysis?.opportunities?.[0]?.service || '', summary: p.analysis?.summary || '' }));
  const cell = (p: any, k: string) => p[k] ?? '';
  const csv = () => download('prospects.csv', '﻿' + COLS.map(c => csvCell(c[0])).join(',') + '\r\n' + list.map(p => COLS.map(c => csvCell(cell(p, c[1]))).join(',')).join('\r\n'), 'text/csv');
  async function xlsx() {
    const w = (await import('write-excel-file/browser')).default;
    const safe = (v: any) => { const s = String(v ?? ''); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; };
    const data = [COLS.map(c => ({ value: c[0], fontWeight: 'bold' as const })), ...list.map(p => COLS.map(c => { const v = cell(p, c[1]); return typeof v === 'number' ? { value: v, type: Number } : { value: safe(v), type: String }; }))];
    await w(data as any).toFile('prospects.xlsx'); setMsg('Excel file downloaded.');
  }
  return <main><header className="top"><h1>Export</h1></header>
    <div className="card"><div className="row"><label>Priority <select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}><option value="">All</option>{['HOT', 'HIGH', 'MEDIUM', 'LOW'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Review <select value={f.review} onChange={e => setF({ ...f, review: e.target.value })}><option value="">All</option>{['Draft', 'Reviewed', 'Approved', 'Rejected'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label><input type="checkbox" style={{ width: 'auto' }} checked={f.researched} onChange={e => setF({ ...f, researched: e.target.checked })} /> Researched only</label></div>
      <p><b>{list.length}</b> prospect(s) will be exported, with the contact details, score, opportunities, drafts and outreach stage.</p>
      <div className="row"><button className="primary" disabled={!list.length} onClick={csv}>Download CSV</button><button disabled={!list.length} onClick={xlsx}>Download Excel</button></div>{msg && <p role="status">{msg}</p>}</div></main>;
}
