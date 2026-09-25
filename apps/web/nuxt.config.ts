import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineNuxtConfig } from 'nuxt/config';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  workspaceDir: '../../',
  devtools: { enabled: true },
  routeRules: {
    // SPA: o servidor entrega na hora o mesmo shell (com o skeleton de
    // app/spa-loading-template.html) em vez de segurar o HTML até a API
    // responder — em rede lenta isso deixava a tela branca por vários
    // segundos. Os dados são por usuário e vêm do token no cookie, então não
    // há ganho de SEO/SSR aqui. Feito por routeRules e não com `ssr: false`
    // global porque este quebra o `nuxt dev` no Nuxt 4.4 ("No entry found in
    // rollupOptions.input").
    '/**': { ssr: false },
    // Antigas rotas de cada aba, que viraram estados dentro de "/" e "/admin".
    // Mantidas como redirect para links salvos e atalhos do PWA não quebrarem.
    '/historico': { redirect: '/' },
    '/loja': { redirect: '/' },
    '/perfil': { redirect: '/' },
    '/generate': { redirect: '/admin' },
  },
  devServer: {
    host: 'localhost',
    port: 4200,
  },
  typescript: {
    typeCheck: true,
    tsConfig: {
      extends: '../../../tsconfig.base.json', // Nuxt copies this string as-is to the `./.nuxt/tsconfig.json`, therefore it needs to be relative to that directory
    },
  },
  imports: {
    autoImport: true,
  },
  runtimeConfig: {
    public: {
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      appleClientId: process.env.NUXT_PUBLIC_APPLE_CLIENT_ID || '',
    },
  },
  modules: ['@vite-pwa/nuxt'],
  app: {
    head: {
      title: 'Dili Rewards',
      meta: [
        { name: 'theme-color', content: '#f2f0ef' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        // iOS não lê o manifest para decidir o modo de exibição — precisa
        // dessas meta tags para abrir em standalone ao instalar via Safari.
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Dili Rewards' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Montserrat+Alternates:wght@100;200;300;400;500;600;700;800&display=swap',
        },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },
  css: ['~/assets/css/styles.scss'],
  vite: {
    plugins: [nxViteTsPaths()],
  },
  pwa: {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico'],
    manifest: {
      name: 'Dili Rewards',
      short_name: 'Dili Rewards',
      description:
        'Programa de fidelidade da Dili Cafés Especiais — acompanhe pontos, suba de nível e resgate produtos exclusivos.',
      lang: 'pt-BR',
      theme_color: '#f2f0ef',
      background_color: '#f2f0ef',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,png,svg,ico}'],
      // O @vite-pwa/nuxt define um navigateFallback: '/' por padrão, que
      // registraria uma NavigationRoute cobrindo TODA navegação antes da
      // regra customizada abaixo — mas o shell é servido pelo servidor Nitro
      // (com o runtimeConfig do ambiente), então não existe um "/" estático
      // precacheado para essa rota servir. Desliga o fallback padrão para a
      // regra NetworkFirst de fato ser usada.
      navigateFallback: null,
      runtimeCaching: [
        // Permite reabrir offline um endereço já visitado antes. O shell é o
        // mesmo para todo usuário (os dados vêm da API depois), então é
        // seguro guardá-lo em cache.
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            networkTimeoutSeconds: 3,
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'google-fonts-stylesheets' },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    devOptions: {
      // Em dev, o vite-pwa registra um SW que precacheia a página atual — na
      // época em que o "/" era SSR autenticado, isso fazia o service worker
      // servir o cartão de um usuário antigo para qualquer sessão depois,
      // ignorando login/logout. O comportamento de
      // PWA em produção (manifest + workbox acima) não usa esse modo dev e
      // não é afetado; para testar instalação/offline localmente, rode
      // `nx build` + preview em vez do dev server.
      enabled: false,
      type: 'module',
    },
  },
});
