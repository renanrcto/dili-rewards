import type { TierLevel } from '~/composables/usePoints';

// Produto como o cliente vê na loja (GET /products): só os ativos.
export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  // URL pública da imagem no Cloudflare R2.
  imageUrl: string;
  // Pontos da troca só com pontos.
  points: number;
  allowsPartialPoints: boolean;
  // Troca parcial: pontos + preço em reais. null sem troca parcial.
  partialPoints: number | null;
  partialPrice: number | null;
  allowedTiers: TierLevel[];
}

/** Loja da troca de pontos do cliente. */
export function useCatalog() {
  const config = useRuntimeConfig();
  const { token } = useAuth();

  /** Produtos ativos, por categoria e do mais barato para o mais caro. */
  function getCatalog(): Promise<CatalogProduct[]> {
    return $fetch<CatalogProduct[]>(`${config.public.apiBaseUrl}/products`, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
  }

  return { getCatalog };
}
