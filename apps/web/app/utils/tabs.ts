// Abas das duas áreas do app. Cada área é uma única rota ("/" e "/admin") e
// a aba é só estado da página — trocar de aba não cria entrada no histórico,
// então o voltar do celular sai do app em vez de percorrer cada tela visitada.
export type ClientTab = 'home' | 'history' | 'store' | 'profile';
export type AdminTab = 'dashboard' | 'sale';
