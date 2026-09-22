declare global {
  interface Window {
    AppleID?: {
      auth: {
        init(options: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }): void;
        signIn(): Promise<{ authorization: { id_token: string } }>;
      };
    };
  }
}

let appleScriptPromise: Promise<void> | null = null;

function loadAppleScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.AppleID) return Promise.resolve();

  appleScriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Não foi possível carregar o login da Apple.'));
    document.head.appendChild(script);
  });

  return appleScriptPromise;
}

export function useAppleAuth() {
  const config = useRuntimeConfig();
  const { loginWithApple } = useAuth();

  async function signIn(): Promise<AuthAccount> {
    const clientId = config.public.appleClientId as string;
    if (!clientId) {
      throw new Error('Login com Apple ainda não está configurado.');
    }

    await loadAppleScript();

    window.AppleID!.auth.init({
      clientId,
      scope: 'name email',
      redirectURI: window.location.origin,
      usePopup: true,
    });

    const result = await window.AppleID!.auth.signIn();
    return loginWithApple(result.authorization.id_token);
  }

  return { signIn };
}
