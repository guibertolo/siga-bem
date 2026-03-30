import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/selecionar-empresa/:path*',
    '/usuarios/:path*',
    '/financeiro/:path*',
    '/fechamentos/:path*',
    '/gastos/:path*',
    '/viagens/:path*',
    '/motoristas/:path*',
    '/caminhoes/:path*',
    '/vinculos/:path*',
    '/empresa/:path*',
    '/configuracoes/:path*',
    '/bi/:path*',
  ],
};
