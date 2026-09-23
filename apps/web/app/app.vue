<script setup lang="ts">
const route = useRoute();

// Opt-in por página (definePageMeta({ bottomMenu: true })) para o menu não
// aparecer em telas fora da área logada, como login, cadastro e admin.
const showBottomMenu = computed(() => route.meta.bottomMenu === true);
</script>

<template>
  <!-- Injeta <link rel="manifest"> de forma reativa — no Nuxt (SSR), ao
  contrário de uma SPA pura, isso não acontece via transformIndexHtml do
  Vite, então o @vite-pwa/nuxt exige este componente para registrar o
  manifest do PWA. -->
  <VitePwaManifest />
  <div :class="['app-shell', { 'app-shell--with-menu': showBottomMenu }]">
    <NuxtPage />
  </div>
  <MenuBottom v-if="showBottomMenu" />
</template>

<style lang="scss">
.app-shell--with-menu {
  // altura do menu + distância até a borda inferior + respiro, para o
  // conteúdo final da página não ficar escondido atrás do menu fixo.
  --bottom-menu-space: calc(4.3125rem + 2rem);
  padding-bottom: var(--bottom-menu-space);
}
</style>
