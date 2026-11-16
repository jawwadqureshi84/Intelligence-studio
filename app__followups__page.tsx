'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { SEQ, STAGES, nextStep, today, daysBetween, isStopped } from '@/lib/followups';

type P = Record<string, any>;
export default function Followups() {
  const sb = useMemo(() => supabaseBrowser(), []); const [rows, setRows] = useState<P[]>([]), [err, setErr] = useState('');
  useEffect(() => { sb.from('prospects').select('id,company_name,contact_name,outreach_stage,outreach_started,outreach_log,score').then(({ data, error }) => error ? setErr(error.message) : setRows(data || [])); }, [sb]);
  const now = today();
  const items = rows.map(p => ({ p, n: nextStep(p as any, now) })).filter(x => x.n).sort((a, b) => a.n!.due.localeCompare(b.n!.due));
  const late = items.filter(x => x.n!.due < now), dueToday = items.filter(x => x.n!.due === now), later = items.filter(x => x.n!.due > now);
  const count = (st: string) => rows.filter(p => p.outreach_stage === st).length;
  const Row = ({ x, tone }: { x: (typeof items)[number]; tone?: string }) => <tr><td><Link href={`/prospect/${x.p.id}`}><b>{x.p.company_name}</b></Link><div className="mut">{x.p.contact_name}</div></td><td>{x.n!.label}<div className="mut">{x.n!.channel}</div></td><td>{tone === 'late' ? <span className="err">{daysBetween(x.n!.due, now)} day(s) late</span> : x.n!.due}</td><td><span className="badge">{x.p.outreach_stage}</span></td></tr>;
  const Table = ({ title, list, tone }: { title: string; list: typeof items; tone?: string }) => <div className="card wrap"><h2>{title} ({list.length})</h2>{!list.length ? <p className="mut">Nothing here.</p> : <table><thead><tr><th>Prospect</th><th>Step</th><th>Due</th><th>Stage</th></tr></thead><tbody>{list.map(x => <Row key={x.p.id} x={x} tone={tone} />)}</tbody></table>}</div>;
  return <main><header className="top"><h1>Follow-ups</h1></header>{err && <p className="err">{err}</p>}
    <div className="card"><h2>Pipeline</h2><div className="row">{STAGES.map(s => <span key={s} className="badge">{s}: <b>{count(s)}</b></span>)}</div>
      <p className="mut" style={{ marginBottom: 0 }}>Sequence: {SEQ.map(s => `day ${s.day} ${s.label.toLowerCase()}`).join(' → ')}. Replied, meeting booked, not interested and won stop the reminders. {rows.filter(isStopped as any).length} prospect(s) are stopped.</p></div>
    <Table title="Overdue" list={late} tone="late" /><Table title="Due today" list={dueToday} /><Table title="Upcoming" list={later} /></main>;
}
