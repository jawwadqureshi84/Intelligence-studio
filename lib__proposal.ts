type P = { company_name: string; contact_name: string; job_title: string; website: string; industry: string; analysis: any; research: any };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function proposalMd(p: P, sender: { name: string; company: string }, date = new Date().toISOString().slice(0, 10)) {
  const a = p.analysis, ops: any[] = (a?.opportunities || []).slice(0, 4);
  const L: string[] = [];
  L.push(`# Proposal outline: ${p.company_name}`, '', `Prepared for: ${p.contact_name ? p.contact_name + (p.job_title ? ', ' + p.job_title + ', ' : ', ') : ''}${p.company_name}`, `Prepared by: ${sender.name || '[Your name]'}${sender.company ? ', ' + sender.company : ''}`, `Date: ${date}`, 'Status: Draft outline for discussion', '');
  L.push('## 1. Understanding your business', '');
  L.push(a?.summary || `${p.company_name}${p.industry ? ' operates in ' + p.industry : ''}.`, '');
  (a?.verified || []).slice(0, 5).forEach((v: string) => L.push(`- ${v}`)); L.push('');
  L.push('## 2. What we noticed', '');
  if (ops.length) ops.forEach(o => L.push(`- **${o.name}** (${o.basis}): ${o.why}`)); else L.push('- No specific gaps were confirmed. A review call would establish priorities.');
  L.push('', '## 3. Proposed work', '');
  ops.forEach((o, i) => L.push(`${i + 1}. **${cap(o.service)}**: addresses "${o.name.toLowerCase()}".`));
  if (!ops.length) L.push('1. Discovery call and website review.');
  L.push('', '## 4. Suggested approach', '', '1. Discovery call to confirm priorities.', '2. Short written plan with scope and timeline.', '3. Delivery in stages, starting with the highest-impact item.', '4. Review and handover.', '');
  L.push('## 5. Timeline and investment', '', '- Timeline: to be agreed after discovery.', '- Investment: to be quoted once scope is confirmed. No figures are included in this outline.', '');
  L.push('## 6. Next steps', '', `1. A 15-minute call with ${p.contact_name || 'the right contact at ' + p.company_name} to confirm which item matters most.`, '2. Share context on current tools, volumes and constraints.', '3. Agree a discovery scope and timeline.', '');
  L.push('## Basis of this outline', '', `Findings marked Verified came from pages read at ${p.research?.openedUrl || 'the prospect website (not read)'}. Anything else is an assumption to confirm with the client.`);
  return L.join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function proposalHtml(md: string) {
  const inline = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  let out = '', list = '';
  const close = () => { if (list) { out += `</${list}>`; list = ''; } };
  for (const line of md.split('\n')) {
    if (line.startsWith('# ')) { close(); out += `<h1>${inline(line.slice(2))}</h1>`; }
    else if (line.startsWith('## ')) { close(); out += `<h2>${inline(line.slice(3))}</h2>`; }
    else if (/^- /.test(line)) { if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(line.slice(2))}</li>`; }
    else if (/^\d+\. /.test(line)) { if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(line.replace(/^\d+\. /, ''))}</li>`; }
    else if (line.trim()) { close(); out += `<p>${inline(line)}</p>`; } else close();
  }
  close();
  return `<!doctype html><html><head><meta charset="utf-8"><title>Proposal outline</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#14192b}h1{font-size:28px}h2{margin-top:28px;border-bottom:1px solid #e3e6ef;padding-bottom:4px}</style></head><body>${out}</body></html>`;
}
