declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
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
 * `container` — o próprio Google decide a UI do botão, então em caso de
 * sucesso o `callback` do `initialize` já recebe o id_token pronto para
 * mandar pra API (POST /auth/google).
 */
export function useGoogleAuth() {
  const config = useRuntimeConfig();
  const { loginWithGoogle } = useAuth();

  async function renderButton(
    container: HTMLElement,
    onSuccess: (user: AuthAccount) => void,
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

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          const user = await loginWithGoogle(response.credential);
          onSuccess(user);
        } catch (error) {
          onError(
            extractErrorMessage(error, 'Não foi possível entrar com o Google.'),
          );
        }
      },
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

  return { renderButton };
}
