import type { AuthAccount, AuthAccountRole } from './useAuth';

// Tela inicial de cada perfil depois do login. Admin e super-admin usam a
// mesma rota; o que muda é o que ela mostra (ver pages/admin.vue).
const HOME_BY_ROLE: Record<AuthAccountRole, string> = {
  customer: '/',
  admin: '/admin',
  super_admin: '/admin',
};

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
    // `replace` tira o login do histórico: o voltar do celular fecha o app
    // em vez de voltar para a tela de login.
    return navigateTo(redirect.value ?? HOME_BY_ROLE[account.role], {
      replace: true,
    });
  }

  return { redirect, goAfterAuth };
}
