'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function Review(props: { id: string; subject: string; body: string; linkedin: string; status: string }) {
  const [s, setS] = useState(props.subject), [b, setB] = useState(props.body), [l, setL] = useState(props.linkedin), [st, setSt] = useState(props.status), [msg, setMsg] = useState('');
  async function save(status = st) {
    const { error } = await supabaseBrowser().from('prospects').update({ email_subject: s, email_body: b, linkedin_message: l, review_status: status }).eq('id', props.id);
    if (error) return setMsg(error.message); setSt(status); setMsg(`Saved (${status}).`);
  }
  return <div className="card"><h2>Outreach draft · <span className="badge">{st}</span></h2>
    <label>Subject<input value={s} onChange={e => setS(e.target.value)} /></label><br /><br />
    <label>Email<textarea rows={10} value={b} onChange={e => setB(e.target.value)} /></label><br /><br />
    <label>LinkedIn message<textarea rows={3} value={l} onChange={e => setL(e.target.value)} /></label>
    <div className="row" style={{ marginTop: 12 }}><button onClick={() => save()}>Save</button><button onClick={() => save('Reviewed')}>Mark reviewed</button><button className="primary" onClick={() => save('Approved')}>Approve</button><button onClick={() => save('Rejected')}>Reject</button>
      <button onClick={() => navigator.clipboard.writeText(`${s}\n\n${b}`)}>Copy email</button></div>
    {msg && <p role="status">{msg}</p>}<p className="mut">Review every draft before sending. Nothing is sent automatically.</p></div>;
}
