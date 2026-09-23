export default defineNuxtRouteMiddleware(async (to) => {
  const { account, fetchCurrentUser } = useAuth();

  if (account.value) return;

  const user = await fetchCurrentUser();
  if (!user) {
    // Guarda a página de origem (ex.: /resgatar?code=...) para voltar a
    // ela depois do login.
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }
});
