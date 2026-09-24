// Deve rodar depois do middleware `auth`, que carrega a conta. É só UX — a
// API valida o role em cada requisição do painel.
export default defineNuxtRouteMiddleware(() => {
  const { account } = useAuth();
  const role = account.value?.role;

  if (role === 'super_admin') return;
  return navigateTo(role === 'admin' ? '/generate' : '/');
});
