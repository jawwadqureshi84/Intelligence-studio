'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function Login() {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  async function go(mode: 'in' | 'up') {
    setBusy(true); setMsg('');
    const sb = supabaseBrowser();
    const { error, data } = mode === 'in' ? await sb.auth.signInWithPassword({ email, password: pw }) : await sb.auth.signUp({ email, password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === 'up' && !data.session) return setMsg('Check your email to confirm your address, then sign in.');
    window.location.href = '/';
  }
  return <main style={{ maxWidth: 420 }}>
    <div className="card"><h1>Prospect Intelligence Studio</h1><p className="mut">Sign in to research your prospects.</p>
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label><br /><br />
      <label>Password<input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" /></label>
      <div className="row" style={{ marginTop: 14 }}><button className="primary" disabled={busy || !email || pw.length < 8} onClick={() => go('in')}>Sign in</button><button disabled={busy || !email || pw.length < 8} onClick={() => go('up')}>Create account</button></div>
      <p className="mut" style={{ fontSize: 13 }}>Password needs 8 or more characters.</p>{msg && <p className="err" role="alert">{msg}</p>}</div>
  </main>;
}
