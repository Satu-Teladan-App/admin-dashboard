import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          const previous = response.cookies.getAll();
          response = NextResponse.next({ request });
          previous.forEach(cookie => response.cookies.set(cookie));
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const redirect = (path) => {
    const target = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach(cookie => target.cookies.set(cookie));
    return target;
  };

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return request.nextUrl.pathname === '/sign-in' ? response : redirect('/sign-in');

  const { data: roles, error: roleError } = await supabase
    .from('admin_roles').select('role_id').eq('user_id', user.id).limit(1);
  const admin = !roleError && roles?.length > 0;
  if (request.nextUrl.pathname === '/sign-in') return admin ? redirect('/overview') : response;
  return admin ? response : redirect('/sign-in');
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets).*)'],
};
