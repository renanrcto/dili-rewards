export interface AuthUser {
  name: string;
  tier: string;
  points: number;
}

/**
 * Dados do cliente logado.
 *
 * TODO: substituir pelo usuário real assim que a autenticação estiver
 * implementada (login via API). Por enquanto retorna um mock para permitir
 * construir as telas que dependem do cliente logado.
 */
export function useAuthUser() {
  const user = useState<AuthUser>('auth-user', () => ({
    name: 'Joana Nascimento',
    tier: 'Platinum',
    points: 4500,
  }));

  return { user };
}
