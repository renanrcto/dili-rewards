// Deve rodar depois do middleware `auth`, que carrega a conta. É só UX — a
// API valida o role em cada requisição de admin.
export default defineNuxtRouteMiddleware(() => {
  const { account } = useAuth();

  if (account.value?.role !== 'admin') {
    return navigateTo('/');
  }
});
