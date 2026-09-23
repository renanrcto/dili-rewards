// Mesma regra do RegisterDto da API: nome e sobrenome, começando por letra.
const FULL_NAME_PATTERN = /^\p{L}[\p{L}'.-]*(?: [\p{L}'.-]+)* \p{L}[\p{L}'.-]*$/u;

// Preposições que ficam minúsculas no meio do nome ("Maria da Silva").
const LOWERCASE_PARTICLES = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function isFullName(name: string): boolean {
  return FULL_NAME_PATTERN.test(normalizeName(name));
}

function capitalize(word: string): string {
  // Também capitaliza partes hifenizadas: "ana-luiza" -> "Ana-Luiza".
  return word
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|-)(\p{L})/gu, (_, sep: string, letter: string) =>
      sep + letter.toLocaleUpperCase('pt-BR'),
    );
}

/**
 * Formata o nome para exibição: cada palavra com inicial maiúscula e o resto
 * minúsculo. Se passar de `maxLength` caracteres, mostra só o primeiro e o
 * último nome.
 */
export function formatDisplayName(name: string, maxLength: number): string {
  const words = normalizeName(name).split(' ').filter(Boolean);
  const formatted = words.map((word, index) => {
    const isEdge = index === 0 || index === words.length - 1;
    const lower = word.toLocaleLowerCase('pt-BR');
    return !isEdge && LOWERCASE_PARTICLES.has(lower) ? lower : capitalize(word);
  });

  const full = formatted.join(' ');
  if (full.length <= maxLength || formatted.length <= 2) return full;
  return `${formatted[0]} ${formatted[formatted.length - 1]}`;
}
