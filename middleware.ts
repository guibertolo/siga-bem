import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Whitelist inversa: middleware roda em TODAS as rotas exceto as publicas.
 * Rotas publicas sao excluidas pelo matcher negativo abaixo.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Matcher inverso: protege tudo EXCETO rotas publicas e assets estaticos.
 *
 * Rotas publicas excluidas:
 * - / (landing)
 * - /login, /signup, /aceitar-convite, /trocar-senha
 * - /auth/* (callback, reset-password)
 * - /tutorial
 * - /sitemap.xml
 * - /_next/* (Next.js internals)
 * - /api/public/* (future public APIs)
 * - Static assets (favicon, logos, images, manifest, sw)
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|logos/|images/|icons/|manifest\\.json|sw\\.js|sitemap\\.xml|api/public|auth/|login|signup|aceitar-convite|trocar-senha|tutorial).*)',
  ],
};
