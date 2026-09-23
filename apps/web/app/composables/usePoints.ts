export interface PointsBalance {
  balance: number;
}

export interface RescueCode {
  code: string;
  expiresAt: string;
}

export interface CreditedPoints {
  id: string;
  purchaseAmount: number;
  points: number;
  createdAt: string;
  expiresAt: string;
}

export function usePoints() {
  const config = useRuntimeConfig();
  const { token } = useAuth();

  function authHeaders() {
    return { Authorization: `Bearer ${token.value}` };
  }

  function getBalance(): Promise<PointsBalance> {
    return $fetch<PointsBalance>(
      `${config.public.apiBaseUrl}/points/balance`,
      { headers: authHeaders() },
    );
  }

  /** Admin: gera o código (válido por 5 minutos) que vai no QR Code. */
  function createRescue(purchaseAmount: number): Promise<RescueCode> {
    return $fetch<RescueCode>(`${config.public.apiBaseUrl}/points/rescues`, {
      method: 'POST',
      headers: authHeaders(),
      body: { purchaseAmount },
    });
  }

  /** Cliente: resgata o código lido no QR Code para a própria conta. */
  function redeem(code: string): Promise<CreditedPoints> {
    return $fetch<CreditedPoints>(`${config.public.apiBaseUrl}/points`, {
      method: 'POST',
      headers: authHeaders(),
      body: { code },
    });
  }

  return { getBalance, createRescue, redeem };
}
