import dns from 'node:dns/promises';
import net from 'node:net';

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    const m = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isPrivateIp(m[1]);
    return v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb');
  }
  return true;
}

/** Parses user input into a candidate http(s) URL, or null. Rejects credentials, odd ports and IP/internal hosts. */
export function parseTarget(raw: string): URL | null {
  const t = (raw || '').trim();
  if (!t || /\s/.test(t)) return null;
  let u: URL;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : 'https://' + t); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== '80' && u.port !== '443') return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost') || net.isIP(h.replace(/^\[|\]$/g, ''))) return null;
  u.hash = '';
  return u;
}

/** Resolves the host and refuses if any address is private, loopback, link-local or metadata. */
export async function assertPublicHost(host: string): Promise<void> {
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('Blocked: address is not public');
}

/** Candidate forms to try when a website value will not open: as given, then www / non-www, https then http. */
export function variants(raw: string): URL[] {
  const base = parseTarget(raw);
  if (!base) return [];
  const bare = base.hostname.replace(/^www\./, '');
  const hosts = base.hostname.startsWith('www.') ? [base.hostname, bare] : [base.hostname, 'www.' + bare];
  const out: URL[] = [];
  for (const proto of ['https:', 'http:']) for (const h of hosts) { const u = new URL(base.toString()); u.protocol = proto; u.hostname = h; out.push(u); }
  return out;
}
