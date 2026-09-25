export default defineNuxtRouteMiddleware((to) => {
  const { account, token, fetchCurrentUser } = useAuth();

  if (account.value) return;

  // Guarda a página de origem (ex.: /resgatar?code=...) para voltar a ela
  // depois do login.
  const loginRoute = { path: '/login', query: { redirect: to.fullPath } };

  if (!token.value) return navigateTo(loginRoute);

  // Com um token salvo, não segura a navegação esperando o /auth/me — em rede
  // lenta isso deixava o app sem nada na tela. A página abre na hora com
  // skeleton e a conta chega logo depois; se o token não valer mais, volta
  // para o login.
  fetchCurrentUser().then((user) => {
    if (!user) navigateTo(loginRoute, { replace: true });
  });
});
