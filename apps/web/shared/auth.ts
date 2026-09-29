// Regras de sessão usadas tanto no app quanto no servidor Nitro (a rota que
// recebe o login do Google em server/routes/auth/google/callback.post.ts).

export type AuthAccountRole = 'customer' | 'admin' | 'super_admin';

export const TOKEN_COOKIE_NAME = 'dili_access_token';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// Onde o Google faz o POST do id_token no login por redirect.
export const GOOGLE_CALLBACK_PATH = '/auth/google/callback';
// Nonce e página de origem guardados antes de ir para o Google, conferidos
// quando ele volta.
export const GOOGLE_LOGIN_COOKIE_NAME = 'dili_google_login';

export interface PendingGoogleLogin {
  nonce: string;
  redirect: string | null;
}

// Tela inicial de cada perfil depois do login. Admin e super-admin usam a
// mesma rota; o que muda é o que ela mostra (ver pages/admin.vue).
export const HOME_BY_ROLE: Record<AuthAccountRole, string> = {
  customer: '/',
  admin: '/admin',
  super_admin: '/admin',
};

// Só caminhos internos ("/algo") — bloqueia "//evil.com" e "/\evil.com",
// que o navegador trata como URL de outro domínio (open redirect).
const INTERNAL_PATH = /^\/(?![/\\])/;

export function toInternalPath(value: unknown): string | null {
  return typeof value === 'string' && INTERNAL_PATH.test(value) ? value : null;
}
