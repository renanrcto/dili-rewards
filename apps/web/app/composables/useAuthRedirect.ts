import { HOME_BY_ROLE, toInternalPath } from '#shared/auth';
import type { AuthAccount } from './useAuth';

/**
 * Lê o `?redirect=` deixado pelo middleware de auth (ex.: cliente que leu o
 * QR Code de resgate sem estar logado) para devolver o usuário à página de
 * origem depois do login/cadastro.
 */
export function useAuthRedirect() {
  const route = useRoute();

  const redirect = computed(() => toInternalPath(route.query.redirect));

  function goAfterAuth(account: AuthAccount) {
    // `replace` tira o login do histórico: o voltar do celular fecha o app
    // em vez de voltar para a tela de login.
    return navigateTo(redirect.value ?? HOME_BY_ROLE[account.role], {
      replace: true,
    });
  }

  return { redirect, goAfterAuth };
}
