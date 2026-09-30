<template>
  <!-- Injeta <link rel="manifest"> de forma reativa — o @vite-pwa/nuxt exige
  este componente para registrar o manifest do PWA no Nuxt. -->
  <VitePwaManifest />
  <NuxtPage />
  <!-- Avisos rápidos (toast). Tema com as cores da marca em _toast.scss. -->
  <Toaster position="top-center" theme="light" rich-colors />
</template>
