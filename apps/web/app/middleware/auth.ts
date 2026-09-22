export default defineNuxtRouteMiddleware(async () => {
  const { account, fetchCurrentUser } = useAuth();

  if (account.value) return;

  const user = await fetchCurrentUser();
  if (!user) {
    return navigateTo('/login');
  }
});
