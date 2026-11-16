export const STAGES = ['Not contacted', 'Email sent', 'LinkedIn sent', 'Follow-up due', 'Replied', 'Meeting booked', 'Not interested', 'Won'] as const;
export const STOPPED = ['Replied', 'Meeting booked', 'Not interested', 'Won'];
export const SEQ = [
  { day: 0, channel: 'Email', label: 'Initial email' },
  { day: 3, channel: 'LinkedIn', label: 'Connect or message on LinkedIn' },
  { day: 7, channel: 'Email', label: 'Follow-up email' },
  { day: 14, channel: 'Email', label: 'Final check-in' },
] as const;

export type Log = { step: number; date: string }[];
export type Pipe = { outreach_stage: string; outreach_started: string | null; outreach_log: Log };

export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
export const isStopped = (p: Pipe) => STOPPED.includes(p.outreach_stage);

export function nextStep(p: Pipe, now = today()) {
  if (isStopped(p) || !p.outreach_started) return null;
  const done = new Set((p.outreach_log || []).map(l => l.step));
  const i = SEQ.findIndex((_, k) => !done.has(k));
  if (i < 0) return null;
  const due = addDays(p.outreach_started, SEQ[i].day);
  return { index: i, ...SEQ[i], due, overdueDays: Math.max(0, daysBetween(due, now)), isDue: due <= now };
}

/** Marks step as sent. Starts the sequence on first send. Returns the patch to save. */
export function markSent(p: Pipe, step: number, now = today()): Pipe & { next_followup: string | null } {
  const started = p.outreach_started || now;
  const log = [...(p.outreach_log || []).filter(l => l.step !== step), { step, date: now }].sort((a, b) => a.step - b.step);
  const stage = step === 0 ? 'Email sent' : SEQ[step].channel === 'LinkedIn' ? 'LinkedIn sent' : 'Email sent';
  const nx = nextStep({ outreach_stage: stage, outreach_started: started, outreach_log: log }, now);
  return { outreach_stage: stage, outreach_started: started, outreach_log: log, next_followup: nx ? nx.due : null };
}

export function setStage(p: Pipe, stage: string): Pipe & { next_followup: string | null } {
  const nx = nextStep({ ...p, outreach_stage: stage });
  return { outreach_stage: stage, outreach_started: p.outreach_started, outreach_log: p.outreach_log || [], next_followup: nx ? nx.due : null };
}

export function followDraft(p: { company_name: string; contact_name: string; email_subject: string; analysis: any }, step: number, sender: { name: string; company: string }) {
  const first = (p.contact_name || '').split(/\s+/)[0]; const hello = first ? `Hi ${first},` : 'Hello,';
  const top = p.analysis?.opportunities?.[0]; const topic = top ? top.service.toLowerCase() : 'your online presence';
  const sign = `${sender.name || '[Your name]'}${sender.company ? '\n' + sender.company : ''}`;
  if (step === 1) return { subject: '', body: `${hello} I sent you an email about ${topic} for ${p.company_name}. Happy to connect here too if that is easier.` };
  if (step === 2) return { subject: 'Re: ' + p.email_subject, body: `${hello}\n\nI wanted to follow up on my note about ${topic} at ${p.company_name}.\n\nWould it be useful if I sent a short outline, or is the timing not right?\n\n${sign}` };
  return { subject: 'Re: ' + p.email_subject, body: `${hello}\n\nI will close the loop here. I am assuming ${topic} is not a priority for ${p.company_name} right now. If that changes, I am glad to help, and a one-page outline is yours on request.\n\n${sign}` };
}
