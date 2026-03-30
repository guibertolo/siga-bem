import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Use getSession() instead of getUser() in middleware for performance.
  // getSession() reads from the cookie locally (no Supabase API round-trip).
  // The actual getUser() verification happens in the layout/page via getCurrentUsuario().
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // All paths in the matcher are protected (require auth session).
  // Public paths (/login, /signup, /aceitar-convite) are NOT in the matcher
  // and never reach this function.
  const isProtected = true;

  if (!session && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
