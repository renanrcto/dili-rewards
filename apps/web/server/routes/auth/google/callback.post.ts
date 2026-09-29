import {
  defineEventHandler,
  deleteCookie,
  getCookie,
  readBody,
  sendRedirect,
  setCookie,
  type H3Event,
} from 'h3';
import {
  GOOGLE_LOGIN_COOKIE_NAME,
  HOME_BY_ROLE,
  SESSION_MAX_AGE_SECONDS,
  TOKEN_COOKIE_NAME,
  toInternalPath,
  type AuthAccountRole,
  type PendingGoogleLogin,
} from '#shared/auth';

interface AuthApiResponse {
  accessToken: string;
  user: { role: AuthAccountRole };
}

const DEFAULT_ERROR = 'Não foi possível entrar com o Google.';

function readPendingLogin(event: H3Event): PendingGoogleLogin | null {
  const raw = getCookie(event, GOOGLE_LOGIN_COOKIE_NAME);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingGoogleLogin>;
    return typeof value.nonce === 'string'
      ? { nonce: value.nonce, redirect: toInternalPath(value.redirect) }
      : null;
  } catch {
    return null;
  }
}

// Só lê o nonce para comparar com o cookie — quem valida a assinatura do
// token é a API, no POST /auth/google logo em seguida.
function readTokenNonce(idToken: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { nonce?: unknown };
    return typeof payload.nonce === 'string' ? payload.nonce : null;
  } catch {
    return null;
  }
}

function extractApiMessage(error: unknown): string {
  const message = (
    error as { data?: { message?: string | string[] } } | undefined
  )?.data?.message;
  if (!message) return DEFAULT_ERROR;
  return Array.isArray(message) ? (message[0] ?? DEFAULT_ERROR) : message;
}

/**
 * Recebe o POST do Google Identity Services no login por redirect (ver
 * app/composables/useGoogleAuth.ts): troca o id_token por uma sessão na API,
 * grava o mesmo cookie de token que o app usa e manda para a tela inicial.
 * Em caso de erro, volta para o login com a mensagem em `?googleError=`.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ credential?: unknown } | null>(event);
  const pending = readPendingLogin(event);
  deleteCookie(event, GOOGLE_LOGIN_COOKIE_NAME, {
    path: '/',
    sameSite: 'none',
    secure: true,
  });

  const fail = (message: string) => {
    const query = new URLSearchParams({ googleError: message });
    if (pending?.redirect) query.set('redirect', pending.redirect);
    return sendRedirect(event, `/login?${query}`, 303);
  };

  const credential = body?.credential;
  if (typeof credential !== 'string' || !credential) {
    return fail(DEFAULT_ERROR);
  }
  if (!pending || readTokenNonce(credential) !== pending.nonce) {
    return fail('O login com o Google expirou. Tente novamente.');
  }

  const config = useRuntimeConfig(event);
  let response: AuthApiResponse;
  try {
    response = await $fetch<AuthApiResponse>(
      `${config.public.apiBaseUrl}/auth/google`,
      { method: 'POST', body: { idToken: credential } },
    );
  } catch (error) {
    return fail(extractApiMessage(error));
  }

  // Mesmos atributos do useCookie em app/composables/useAuth.ts — sem
  // httpOnly, porque o app lê o token para mandar no header da API.
  setCookie(event, TOKEN_COOKIE_NAME, response.accessToken, {
    path: '/',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // 303: o navegador segue com GET, e o POST não fica no histórico.
  return sendRedirect(
    event,
    pending.redirect ?? HOME_BY_ROLE[response.user.role],
    303,
  );
});
