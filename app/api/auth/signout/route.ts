import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyCorsHeaders, handleOptions } from '@/lib/cors';

const ALLOWED_METHODS = 'POST, OPTIONS';

export async function OPTIONS(request: Request) {
  return handleOptions(request, ALLOWED_METHODS) ?? new NextResponse(null, { status: 405 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const origin = request.headers.get('Origin');
  const response = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    { status: 302 },
  );

  return applyCorsHeaders(response, origin, ALLOWED_METHODS);
}
