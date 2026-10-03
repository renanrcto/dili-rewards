import {
  SESSION_MAX_AGE_SECONDS,
  TOKEN_COOKIE_NAME,
  type AuthAccountRole,
} from '#shared/auth';

export type { AuthAccountRole };
export type AuthAccountProvider = 'local' | 'google' | 'apple';

export interface AuthAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: AuthAccountProvider;
  role: AuthAccountRole;
  // false = conta pendente: só troca pontos depois de confirmar o e-mail.
  emailVerified: boolean;
  // ISO 8601 — datas chegam como string no JSON.
  createdAt: string;
}

interface AuthApiResponse {
  accessToken: string;
  user: AuthAccount;
}

// Um único GET /auth/me em andamento por vez — o middleware de auth e o de
// admin podem pedir a conta na mesma navegação.
let currentUserRequest: Promise<AuthAccount | null> | null = null;

export function extractErrorMessage(error: unknown, fallback: string): string {
  const message = (
    error as { data?: { message?: string | string[] } } | undefined
  )?.data?.message;
  if (!message) return fallback;
  return Array.isArray(message) ? (message[0] ?? fallback) : message;
}

export function useAuth() {
  const config = useRuntimeConfig();
  const account = useState<AuthAccount | null>('auth-account', () => null);
  const token = useCookie<string | null>(TOKEN_COOKIE_NAME, {
    default: () => null,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  function applyAuthResponse(response: AuthApiResponse): AuthAccount {
    token.value = response.accessToken;
    account.value = response.user;
    return response.user;
  }

  function post(path: string, body: Record<string, unknown>) {
    return $fetch<AuthApiResponse>(`${config.public.apiBaseUrl}${path}`, {
      method: 'POST',
      body,
    });
  }

  async function register(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthAccount> {
    return applyAuthResponse(await post('/auth/register', input));
  }

  async function login(input: {
    email: string;
    password: string;
  }): Promise<AuthAccount> {
    return applyAuthResponse(await post('/auth/login', input));
  }

  async function loginWithApple(idToken: string): Promise<AuthAccount> {
    return applyAuthResponse(await post('/auth/apple', { idToken }));
  }

  // A API responde igual exista ou não uma conta com o e-mail.
  async function requestPasswordReset(email: string): Promise<void> {
    await $fetch(`${config.public.apiBaseUrl}/auth/forgot-password`, {
      method: 'POST',
      body: { email },
    });
  }

  async function resetPassword(input: {
    token: string;
    password: string;
  }): Promise<AuthAccount> {
    return applyAuthResponse(await post('/auth/reset-password', input));
  }

  /** Envia (ou reenvia) o código de confirmação para o e-mail da conta. */
  async function sendEmailVerification(): Promise<void> {
    await $fetch(`${config.public.apiBaseUrl}/auth/email-verification`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` },
    });
  }

  async function confirmEmail(code: string): Promise<AuthAccount> {
    account.value = await $fetch<AuthAccount>(
      `${config.public.apiBaseUrl}/auth/email-verification/confirm`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` },
        body: { code },
      },
    );
    return account.value;
  }

  function logout() {
    token.value = null;
    account.value = null;
    // Descarta dados em cache (ex.: saldo de pontos) para que o próximo
    // usuário a entrar não veja os dados do anterior.
    clearNuxtData();
  }

  /**
   * Recarrega a conta a partir do token salvo (GET /auth/me) — necessário
   * porque o `account` (useState) não sobrevive a um novo carregamento de
   * página/SSR, só o cookie do token sobrevive.
   */
  function fetchCurrentUser(): Promise<AuthAccount | null> {
    currentUserRequest ??= requestCurrentUser().finally(() => {
      currentUserRequest = null;
    });
    return currentUserRequest;
  }

  async function requestCurrentUser(): Promise<AuthAccount | null> {
    if (!token.value) {
      account.value = null;
      return null;
    }

    try {
      account.value = await $fetch<AuthAccount>(
        `${config.public.apiBaseUrl}/auth/me`,
        { headers: { Authorization: `Bearer ${token.value}` } },
      );
      return account.value;
    } catch {
      token.value = null;
      account.value = null;
      return null;
    }
  }

  return {
    account,
    token,
    register,
    login,
    loginWithApple,
    requestPasswordReset,
    resetPassword,
    sendEmailVerification,
    confirmEmail,
    logout,
    fetchCurrentUser,
  };
}
