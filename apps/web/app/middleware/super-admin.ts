// Deve rodar depois do middleware `auth`. Só UX, como o `admin` — a API
// valida o role em cada requisição.
export default defineNuxtRouteMiddleware(async (to) => {
  const { account, fetchCurrentUser } = useAuth();
  const user = account.value ?? (await fetchCurrentUser());

  if (!user) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }
  if (user.role !== 'super_admin') {
    return navigateTo(user.role === 'admin' ? '/admin' : '/');
  }
});
