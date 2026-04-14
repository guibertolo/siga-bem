import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyCorsHeaders, handleOptions } from '@/lib/cors';

const ALLOWED_METHODS = 'GET, OPTIONS';

export async function OPTIONS(request: Request) {
  return handleOptions(request, ALLOWED_METHODS) ?? new NextResponse(null, { status: 405 });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const requestOrigin = request.headers.get('Origin');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user has multiple empresas — redirect to selection screen
      const { data: empresas } = await supabase.rpc('fn_get_user_empresas');

      if (empresas && empresas.length > 1) {
        // Check if user already has an active empresa set
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: usuario } = await supabase
            .from('usuario')
            .select('empresa_id')
            .eq('auth_id', user.id)
            .single();

          if (!usuario?.empresa_id) {
            const response = NextResponse.redirect(`${origin}/selecionar-empresa`);
            return applyCorsHeaders(response, requestOrigin, ALLOWED_METHODS);
          }
        }
      }

      const response = NextResponse.redirect(`${origin}${next}`);
      return applyCorsHeaders(response, requestOrigin, ALLOWED_METHODS);
    }
  }

  // Auth error — redirect back to login
  const response = NextResponse.redirect(`${origin}/login`);
  return applyCorsHeaders(response, requestOrigin, ALLOWED_METHODS);
}
