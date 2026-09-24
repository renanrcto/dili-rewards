export interface DailyPointsItem {
  id: string;
  userName: string;
  purchaseAmount: number;
  points: number;
  createdAt: string;
}

export interface DailyPointsReport {
  // YYYY-MM-DD, no fuso da loja.
  date: string;
  items: DailyPointsItem[];
  totals: { credits: number; purchaseAmount: number; points: number };
}

export interface ConversionRate {
  id: string;
  pointsPerReal: number;
  observation: string | null;
  active: boolean;
  createdAt: string;
  // null = taxa padrão, sem prazo.
  expiresAt: string | null;
}

/** Chamadas do painel gerencial (somente super-admin). */
export function useAdmin() {
  const config = useRuntimeConfig();
  const { token } = useAuth();

  function authHeaders() {
    return { Authorization: `Bearer ${token.value}` };
  }

  /** Créditos de pontos de um dia (padrão: hoje), mais recentes primeiro. */
  function getDailyPoints(date?: string): Promise<DailyPointsReport> {
    return $fetch<DailyPointsReport>(
      `${config.public.apiBaseUrl}/admin/points/daily`,
      { headers: authHeaders(), query: date ? { date } : {} },
    );
  }

  /** Taxas em vigor; a primeira é a usada nos créditos agora. */
  function getRates(): Promise<ConversionRate[]> {
    return $fetch<ConversionRate[]>(
      `${config.public.apiBaseUrl}/points/rates`,
      {
        headers: authHeaders(),
      },
    );
  }

  /** Sem `durationHours`, a nova taxa vira a padrão. */
  function createRate(input: {
    pointsPerReal: number;
    durationHours?: number;
    observation?: string;
  }): Promise<ConversionRate> {
    return $fetch<ConversionRate>(`${config.public.apiBaseUrl}/points/rates`, {
      method: 'POST',
      headers: authHeaders(),
      body: input,
    });
  }

  /** Encerra uma taxa antes do prazo. */
  function deactivateRate(id: string): Promise<ConversionRate> {
    return $fetch<ConversionRate>(
      `${config.public.apiBaseUrl}/points/rates/${id}`,
      { method: 'PATCH', headers: authHeaders(), body: { active: false } },
    );
  }

  return { getDailyPoints, getRates, createRate, deactivateRate };
}
