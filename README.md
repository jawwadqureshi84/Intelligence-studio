# Prospect Intelligence Studio

Next.js + Supabase app. Import prospects (CSV), read each prospect's website server-side (https/http/www variants, robots.txt respected, SSRF-guarded), find social links, score 0-100, draft email and LinkedIn outreach, review and export.

Supabase project: khglynzhjfjdswhrzckf (tables `prospects`, `research_usage`, RLS on, already migrated).

## Deploy to Vercel
1. Push this folder to a GitHub repo, then import it at vercel.com/new (framework: Next.js).
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (values in `.env.example`). Optional: `ANTHROPIC_API_KEY`, `BRAVE_SEARCH_API_KEY`, `DAILY_RESEARCH_LIMIT`.
3. Supabase > Authentication > URL Configuration: set Site URL to your Vercel URL.
4. Deploy. Create an account on /login.

## Local
`cp .env.example .env.local && npm install && npm run dev`   ·   Tests: `npm test`
