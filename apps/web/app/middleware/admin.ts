// Deve rodar depois do middleware `auth`. Aqui a conta é esperada, porque o
// role decide o que a página mostra. É só UX — a API valida o role em cada
// requisição de admin.
export default defineNuxtRouteMiddleware(async (to) => {
  const { account, fetchCurrentUser } = useAuth();
  const user = account.value ?? (await fetchCurrentUser());

  if (!user) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return navigateTo('/');
  }
});
