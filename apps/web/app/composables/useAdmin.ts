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

export type LogLevel = 'warn' | 'error';

export interface LogItem {
  id: string;
  level: LogLevel;
  // Classe que gerou o log ou 'HTTP' para requisições com erro.
  context: string | null;
  message: string;
  stack: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PaginatedLogs {
  items: LogItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LogsFilter {
  // Dias YYYY-MM-DD no fuso da loja, inclusivos.
  from?: string;
  to?: string;
  level?: LogLevel;
  page?: number;
}

export type ProductStatus = 'active' | 'inactive';
export type ProductTier = 'standard' | 'gold' | 'platinum' | 'black';

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  // URL pública da imagem no Cloudflare R2.
  imageUrl: string;
  // Pontos da troca só com pontos.
  points: number;
  status: ProductStatus;
  allowsPartialPoints: boolean;
  // Troca parcial: pontos + preço em reais. null sem troca parcial.
  partialPoints: number | null;
  partialPrice: number | null;
  allowedTiers: ProductTier[];
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

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

  /** Warnings e erros da API, mais recentes primeiro. */
  function getLogs(filter: LogsFilter): Promise<PaginatedLogs> {
    // Remove os filtros vazios para não mandar `level=` na query.
    const query = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value),
    );
    return $fetch<PaginatedLogs>(`${config.public.apiBaseUrl}/admin/logs`, {
      headers: authHeaders(),
      query,
    });
  }

  /** Produtos da troca de pontos (de uma categoria, se informada). */
  function getProducts(category?: string): Promise<Product[]> {
    return $fetch<Product[]>(`${config.public.apiBaseUrl}/admin/products`, {
      headers: authHeaders(),
      query: category ? { category } : {},
    });
  }

  /** Categorias já usadas nos produtos, em ordem alfabética. */
  function getProductCategories(): Promise<string[]> {
    return $fetch<string[]>(
      `${config.public.apiBaseUrl}/admin/products/categories`,
      { headers: authHeaders() },
    );
  }

  function getProduct(id: string): Promise<Product> {
    return $fetch<Product>(`${config.public.apiBaseUrl}/admin/products/${id}`, {
      headers: authHeaders(),
    });
  }

  function createProduct(input: ProductInput): Promise<Product> {
    return $fetch<Product>(`${config.public.apiBaseUrl}/admin/products`, {
      method: 'POST',
      headers: authHeaders(),
      body: input,
    });
  }

  function updateProduct(
    id: string,
    input: Partial<ProductInput>,
  ): Promise<Product> {
    return $fetch<Product>(`${config.public.apiBaseUrl}/admin/products/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: input,
    });
  }

  /** Envia a imagem para o R2 (via API) e devolve a URL pública. */
  async function uploadProductImage(file: File): Promise<string> {
    const body = new FormData();
    body.append('file', file);
    const { url } = await $fetch<{ url: string }>(
      `${config.public.apiBaseUrl}/admin/products/image`,
      { method: 'POST', headers: authHeaders(), body },
    );
    return url;
  }

  return {
    getDailyPoints,
    getRates,
    createRate,
    deactivateRate,
    getLogs,
    getProducts,
    getProductCategories,
    getProduct,
    createProduct,
    updateProduct,
    uploadProductImage,
  };
}
