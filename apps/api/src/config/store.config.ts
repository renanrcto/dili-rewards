// Fuso da loja: define onde começa e termina "o dia" nos relatórios do
// painel (pontos do dia, logs).
export const STORE_TIME_ZONE = 'America/Sao_Paulo';

// Unidades da Dili. Promoções de taxa de conversão valem por unidade e o
// QR Code de cada venda registra onde ela aconteceu.
export enum StoreUnit {
  LUCAS = 'lucas',
  CENTRO = 'centro',
  ALVINOPOLIS = 'alvinopolis',
}
