// Unidades da Dili (mesmos valores do enum StoreUnit da API). Promoções de
// taxa valem por unidade e cada QR Code de venda registra a sua.
export type StoreUnit = 'lucas' | 'centro' | 'alvinopolis';

export const STORE_UNITS: { value: StoreUnit; label: string }[] = [
  { value: 'lucas', label: 'Dili Lucas' },
  { value: 'centro', label: 'Dili Centro' },
  { value: 'alvinopolis', label: 'Dili Alvinópolis' },
];

export function storeUnitLabel(unit: StoreUnit): string {
  return STORE_UNITS.find((item) => item.value === unit)?.label ?? unit;
}
