// Regras de preço dos produtos da troca de pontos. O formulário do painel
// repete estas contas para a prévia (apps/web/app/utils/product-pricing.ts);
// o valor gravado é sempre o calculado aqui.

// Faixa da taxa de conversão, em % do preço final.
export const MIN_CONVERSION_RATE = 2;
export const MAX_CONVERSION_RATE = 8;

// As contas usam centavos e centésimos de % inteiros: 19.9 * 5 dá
// 99.49999… em ponto flutuante e arredondaria para baixo.
const toHundredths = (value: number) => Math.round(value * 100);

/** Pontos da troca integral: preço final * taxa (%) / 100 * 100. */
export function calculatePoints(finalPrice: number, conversionRate: number) {
  return Math.round(
    (toHundredths(finalPrice) * toHundredths(conversionRate)) / 10_000,
  );
}

/** Troca parcial: custo + 10% (R$) e 60% dos pontos da troca integral. */
export function calculatePartial(cost: number, points: number) {
  return {
    partialPrice: Math.round((toHundredths(cost) * 11) / 10) / 100,
    partialPoints: Math.round((points * 6) / 10),
  };
}
