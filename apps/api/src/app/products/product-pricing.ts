// Regras de preço dos produtos da troca de pontos. O formulário do painel
// repete estas contas para a prévia (apps/web/app/utils/product-pricing.ts);
// o valor gravado é sempre o calculado aqui.

// Faixa da taxa de conversão, como fração (0.05 = 5%).
export const MIN_CONVERSION_RATE = 0.02;
export const MAX_CONVERSION_RATE = 0.08;
// Maior preço final aceito: 100.000 / 0.02 * 100 = 500 milhões de pontos,
// dentro do integer da coluna points.
export const MAX_FINAL_PRICE = 100_000;

// As contas usam centavos e décimos de milésimo inteiros para não sofrer
// com arredondamento de ponto flutuante (19.9 * 5 dá 99.49999…).
const toCents = (value: number) => Math.round(value * 100);
const toTenThousandths = (value: number) => Math.round(value * 10_000);

/**
 * Pontos da troca integral: (preço final / taxa) * 100.
 * Ex.: R$ 9 a 0.05 = 9 / 0.05 * 100 = 18.000 pontos.
 */
export function calculatePoints(finalPrice: number, conversionRate: number) {
  return Math.round(
    (toCents(finalPrice) * 10_000) / toTenThousandths(conversionRate),
  );
}

/** Troca parcial: custo + 10% (R$) e 60% dos pontos da troca integral. */
export function calculatePartial(cost: number, points: number) {
  return {
    partialPrice: Math.round((toCents(cost) * 11) / 10) / 100,
    partialPoints: Math.round((points * 6) / 10),
  };
}
