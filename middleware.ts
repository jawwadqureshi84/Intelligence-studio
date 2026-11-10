import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => req.cookies.getAll(), setAll: (list: any[]) => { list.forEach((c: any) => req.cookies.set(c.name, c.value)); res = NextResponse.next({ request: req }); list.forEach((c: any) => res.cookies.set(c.name, c.value, c.options)); } },
  });
  const { data: { user } } = await sb.auth.getUser();
  const open = req.nextUrl.pathname.startsWith('/login');
  if (!user && !open) { const u = req.nextUrl.clone(); u.pathname = '/login'; return NextResponse.redirect(u); }
  if (user && open) { const u = req.nextUrl.clone(); u.pathname = '/'; return NextResponse.redirect(u); }
  return res;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
