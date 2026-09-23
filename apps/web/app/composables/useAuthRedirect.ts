import type { AuthAccount } from './useAuth';

// Só caminhos internos ("/algo") — bloqueia "//evil.com" e "/\evil.com",
// que o navegador trata como URL de outro domínio (open redirect).
const INTERNAL_PATH = /^\/(?![/\\])/;

/**
 * Lê o `?redirect=` deixado pelo middleware de auth (ex.: cliente que leu o
 * QR Code de resgate sem estar logado) para devolver o usuário à página de
 * origem depois do login/cadastro.
 */
export function useAuthRedirect() {
  const route = useRoute();

  const redirect = computed(() => {
    const value = route.query.redirect;
    return typeof value === 'string' && INTERNAL_PATH.test(value)
      ? value
      : null;
  });

  function goAfterAuth(account: AuthAccount) {
    return navigateTo(
      redirect.value ?? (account.role === 'admin' ? '/admin' : '/'),
    );
  }

  return { redirect, goAfterAuth };
}
