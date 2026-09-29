import {
  GOOGLE_CALLBACK_PATH,
  GOOGLE_LOGIN_COOKIE_NAME,
  type PendingGoogleLogin,
} from '#shared/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string;
            ux_mode: 'redirect';
            login_uri: string;
            nonce: string;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: Record<string, unknown>,
          ): void;
        };
      };
    };
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();

  googleScriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Não foi possível carregar o login do Google.'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

/**
 * Renderiza o botão oficial do Google Identity Services dentro de
 * `container`, em modo redirect: o usuário sai para o Google e volta por um
 * POST com o id_token em GOOGLE_CALLBACK_PATH, tratado pelo servidor Nitro
 * (server/routes/auth/google/callback.post.ts), que abre a sessão e manda
 * para a home.
 *
 * Não usamos o modo popup (o padrão) porque no app instalado no iPhone e nos
 * navegadores internos de Instagram/WhatsApp o popup não consegue devolver o
 * token para a janela do app — o cliente fazia o login e ficava numa tela
 * branca do Google.
 */
export function useGoogleAuth() {
  const config = useRuntimeConfig();
  const route = useRoute();
  // SameSite=None: o Google volta com um POST vindo de outro site, e cookies
  // Lax não vão junto nesse caso.
  const pendingLogin = useCookie<PendingGoogleLogin | null>(
    GOOGLE_LOGIN_COOKIE_NAME,
    { sameSite: 'none', secure: true, maxAge: 60 * 30 },
  );

  // Mensagem deixada pelo callback quando o login falha.
  const redirectError = computed(() => {
    const value = route.query.googleError;
    return typeof value === 'string' ? value : '';
  });

  async function renderButton(
    container: HTMLElement,
    redirect: string | null,
    onError: (message: string) => void,
  ): Promise<void> {
    const clientId = config.public.googleClientId as string;
    if (!clientId) {
      onError('Login com Google ainda não está configurado.');
      return;
    }

    try {
      await loadGoogleScript();
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o login do Google.',
      );
      return;
    }

    // O nonce vai dentro do id_token e é conferido com o cookie no callback:
    // garante que o POST veio de um login iniciado neste navegador.
    const nonce = crypto.randomUUID();
    pendingLogin.value = { nonce, redirect };

    window.google!.accounts.id.initialize({
      client_id: clientId,
      ux_mode: 'redirect',
      login_uri: `${window.location.origin}${GOOGLE_CALLBACK_PATH}`,
      nonce,
    });

    window.google!.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'center',
      width: container.clientWidth || 320,
    });
  }

  return { renderButton, redirectError };
}
