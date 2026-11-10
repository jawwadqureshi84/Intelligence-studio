import * as cheerio from 'cheerio';
import { assertPublicHost, variants, parseTarget } from './safe-url';

const UA = 'ProspectIntelligenceBot/1.0 (+business research; respects robots.txt)';
const MAX_BYTES = 1_000_000, TIMEOUT_MS = 10_000, MAX_PAGES = 5, MAX_REDIRECTS = 4;

export type Page = { url: string; title: string; description: string; headings: string[]; text: string; links: string[]; html: string };
export type SocialLink = { network: string; url: string; source: 'website' | 'search' };
export type Research = {
  status: 'Completed' | 'Partial' | 'Failed';
  openedUrl: string; tried: { url: string; ok: boolean; error?: string }[];
  pages: { url: string; title: string }[];
  title: string; description: string; headings: string[]; nav: string[];
  emails: string[]; phones: string[]; social: SocialLink[]; signals: Record<string, boolean>;
  textSample: string; notes: string[]; researchedAt: string;
};

async function guardedFetch(start: URL, accept: string): Promise<{ res: Response; url: URL; body: string }> {
  let u = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublicHost(u.hostname);
    const res = await fetch(u, { redirect: 'manual', headers: { 'user-agent': UA, accept, 'accept-language': 'en' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = parseTarget(new URL(res.headers.get('location')!, u).toString());
      if (!next) throw new Error('Redirected to an unsafe address');
      u = next; continue;
    }
    const reader = res.body?.getReader(); const chunks: Uint8Array[] = []; let n = 0;
    while (reader) { const { done, value } = await reader.read(); if (done) break; n += value.length; if (n > MAX_BYTES) { await reader.cancel(); break; } chunks.push(value); }
    return { res, url: u, body: Buffer.concat(chunks).toString('utf8') };
  }
  throw new Error('Too many redirects');
}

async function robotsAllows(u: URL): Promise<boolean> {
  try {
    const { res, body } = await guardedFetch(new URL('/robots.txt', u), 'text/plain');
    if (!res.ok) return true;
    let applies = false; const disallow: string[] = [];
    for (const raw of body.split(/\r?\n/)) {
      const line = raw.split('#')[0].trim(); const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
      const k = m[1].toLowerCase(), v = m[2].trim();
      if (k === 'user-agent') applies = v === '*' || /prospectintelligence/i.test(v);
      else if (applies && k === 'disallow' && v) disallow.push(v);
    }
    return !disallow.some(d => d === '/' || u.pathname.startsWith(d));
  } catch { return true; }
}

function parsePage(url: URL, html: string): Page {
  const $ = cheerio.load(html);
  const links = $('a[href]').map((_, a) => $(a).attr('href') || '').get();
  const headings = $('h1,h2,h3').map((_, h) => $(h).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean).slice(0, 25);
  const title = $('title').first().text().replace(/\s+/g, ' ').trim();
  const description = $('meta[name="description"]').attr('content')?.trim() || $('meta[property="og:description"]').attr('content')?.trim() || '';
  $('script,style,noscript,svg,iframe').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 6000);
  return { url: url.toString(), title, description, headings, text, links: links.map(l => { try { return new URL(l, url).toString(); } catch { return ''; } }).filter(Boolean), html };
}

const NETWORKS: [string, RegExp][] = [
  ['LinkedIn', /^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(company|in|school)\/[^/?#]+/i],
  ['Facebook', /^https?:\/\/(?:www\.|m\.)?facebook\.com\/(?!sharer|share|tr\b|plugins|dialog)[^/?#]+/i],
  ['Instagram', /^https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|explore|accounts)[^/?#]+/i],
  ['X', /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!intent|share|home)[^/?#]+/i],
  ['YouTube', /^https?:\/\/(?:www\.)?youtube\.com\/(@|channel\/|c\/|user\/)[^/?#]+/i],
  ['TikTok', /^https?:\/\/(?:www\.)?tiktok\.com\/@[^/?#]+/i],
];
export function socialFrom(links: string[], source: 'website' | 'search' = 'website'): SocialLink[] {
  const seen = new Set<string>(); const out: SocialLink[] = [];
  for (const l of links) for (const [network, re] of NETWORKS) {
    const m = l.match(re); if (!m) continue;
    const url = m[0].replace(/^http:/, 'https:'); const key = network + url.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push({ network, url, source }); }
  }
  return out;
}

export function signalsFrom(html: string, pages: Page[], https: boolean): Record<string, boolean> {
  const all = html.toLowerCase(), txt = pages.map(p => p.text).join(' ').toLowerCase();
  return {
    https, mobileViewport: /name=["']viewport["']/.test(all),
    booking: /calendly|book (an )?(appointment|online|now|a call)|schedule (a )?(call|appointment)|acuity|setmore/.test(all + txt),
    ecommerce: /add to cart|shopify|woocommerce|checkout|\/cart\b|buy now/.test(all + txt),
    liveChat: /intercom|drift|tawk\.to|livechat|crisp\.chat|tidio|hubspot.*conversations/.test(all),
    whatsapp: /wa\.me|whatsapp/.test(all),
    analytics: /googletagmanager|google-analytics|gtag\(|plausible|matomo|fbq\(/.test(all),
    contactForm: /<form[\s>]/.test(all),
    structuredData: /application\/ld\+json/.test(all),
    blog: pages.some(p => /\/(blog|news|insights|articles)\b/.test(p.url)),
    pricingPage: pages.some(p => /pricing|plans/.test(p.url)),
    portal: /client portal|customer portal|member login|log ?in|sign in/.test(txt),
    newsletter: /newsletter|subscribe/.test(txt),
  };
}

const INTERESTING = /(about|services?|solutions?|products?|pricing|contact|team|what-we-do|work|portfolio|industries)/i;

export async function researchSite(raw: string, extraSocialUrls: string[] = []): Promise<Research> {
  const r: Research = { status: 'Failed', openedUrl: '', tried: [], pages: [], title: '', description: '', headings: [], nav: [], emails: [], phones: [], social: [], signals: {}, textSample: '', notes: [], researchedAt: new Date().toISOString() };
  const cands = variants(raw);
  if (!cands.length) { r.notes.push('No usable website address. Add one to enable website reading.'); }
  let home: Page | null = null; let homeUrl: URL | null = null;
  for (const c of cands) {
    try {
      if (!(await robotsAllows(c))) { r.tried.push({ url: c.toString(), ok: false, error: 'Blocked by robots.txt' }); r.notes.push(`robots.txt disallows reading ${c.host}; nothing was fetched.`); break; }
      const { res, url, body } = await guardedFetch(c, 'text/html,application/xhtml+xml');
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !/html/i.test(ct)) { r.tried.push({ url: c.toString(), ok: false, error: `HTTP ${res.status}${ct ? ' ' + ct.split(';')[0] : ''}` }); continue; }
      r.tried.push({ url: c.toString(), ok: true }); home = parsePage(url, body); homeUrl = url; break;
    } catch (e: any) { r.tried.push({ url: c.toString(), ok: false, error: String(e?.cause?.code || e?.message || e).slice(0, 80) }); }
  }
  const pages: Page[] = [];
  if (home && homeUrl) {
    pages.push(home); r.openedUrl = homeUrl.toString();
    const picks = [...new Set(home.links.filter(l => { try { const u = new URL(l); return u.hostname.replace(/^www\./, '') === homeUrl!.hostname.replace(/^www\./, '') && u.pathname !== '/' && INTERESTING.test(u.pathname) && !/\.(pdf|jpg|png|zip)$/i.test(u.pathname); } catch { return false; } }).map(l => l.split('#')[0]))].slice(0, MAX_PAGES - 1);
    for (const l of picks) {
      try {
        const t = parseTarget(l); if (!t || !(await robotsAllows(t))) continue;
        const { res, url, body } = await guardedFetch(t, 'text/html');
        if (res.ok && /html/i.test(res.headers.get('content-type') || '')) pages.push(parsePage(url, body));
      } catch { /* skip page */ }
    }
  }
  const html = pages.map(p => p.html).join('\n');
  if (pages.length) {
    r.pages = pages.map(p => ({ url: p.url, title: p.title }));
    r.title = pages[0].title; r.description = pages[0].description;
    r.headings = [...new Set(pages.flatMap(p => p.headings))].slice(0, 30);
    const $ = cheerio.load(pages[0].html); r.nav = [...new Set($('nav a, header a').map((_, a) => $(a).text().replace(/\s+/g, ' ').trim()).get().filter(t => t && t.length < 40))].slice(0, 20);
    r.emails = [...new Set((html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).filter(e => !/\.(png|jpg|gif|svg|webp)$/i.test(e) && !/sentry|example\.com|wixpress/i.test(e)).map(e => e.toLowerCase()))].slice(0, 5);
    r.phones = [...new Set([...html.matchAll(/href=["']tel:([^"']+)["']/gi)].map(m => decodeURIComponent(m[1]).trim()))].slice(0, 5);
    r.social = socialFrom(pages.flatMap(p => p.links));
    r.signals = signalsFrom(html, pages, homeUrl!.protocol === 'https:');
    r.textSample = pages.map(p => p.text).join(' ').slice(0, 5000);
    r.status = 'Completed';
  }
  const extra = socialFrom(extraSocialUrls, 'search').filter(s => !r.social.some(x => x.url.toLowerCase() === s.url.toLowerCase()));
  r.social.push(...extra);
  if (!pages.length) { r.status = 'Failed'; r.notes.push('The website could not be opened with https, http, or www variants.'); }
  else if (pages.length === 1) { r.status = 'Partial'; r.notes.push('Only the home page could be read.'); }
  return r;
}

/** Optional: find social profile URLs via Brave Search. Results are candidates, not verified matches. */
export async function searchSocial(company: string, city: string): Promise<string[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY; if (!key || !company) return [];
  const found: string[] = [];
  for (const site of ['linkedin.com/company', 'facebook.com', 'instagram.com']) {
    try {
      const q = encodeURIComponent(`${company} ${city} site:${site}`);
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${q}&count=3`, { headers: { 'X-Subscription-Token': key, accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue; const j: any = await res.json();
      found.push(...(j.web?.results || []).slice(0, 1).map((x: any) => x.url));
    } catch { /* ignore */ }
  }
  return found;
}
