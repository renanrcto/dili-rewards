export type AuthAccountProvider = 'local' | 'google' | 'apple';

export interface AuthAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: AuthAccountProvider;
}

interface AuthApiResponse {
  accessToken: string;
  user: AuthAccount;
}

const TOKEN_COOKIE_NAME = 'dili_access_token';

export function extractErrorMessage(error: unknown, fallback: string): string {
  const message = (
    error as { data?: { message?: string | string[] } } | undefined
  )?.data?.message;
  if (!message) return fallback;
  return Array.isArray(message) ? message[0] ?? fallback : message;
}

export function useAuth() {
  const config = useRuntimeConfig();
  const account = useState<AuthAccount | null>('auth-account', () => null);
  const token = useCookie<string | null>(TOKEN_COOKIE_NAME, {
    default: () => null,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
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

  async function loginWithGoogle(idToken: string): Promise<AuthAccount> {
    return applyAuthResponse(await post('/auth/google', { idToken }));
  }

  async function loginWithApple(idToken: string): Promise<AuthAccount> {
    return applyAuthResponse(await post('/auth/apple', { idToken }));
  }

  function logout() {
    token.value = null;
    account.value = null;
  }

  /**
   * Recarrega a conta a partir do token salvo (GET /auth/me) — necessário
   * porque o `account` (useState) não sobrevive a um novo carregamento de
   * página/SSR, só o cookie do token sobrevive.
   */
  async function fetchCurrentUser(): Promise<AuthAccount | null> {
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
    loginWithGoogle,
    loginWithApple,
    logout,
    fetchCurrentUser,
  };
}
