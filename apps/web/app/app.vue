<script setup lang="ts"></script>

<template>
  <!-- Injeta <link rel="manifest"> de forma reativa — no Nuxt (SSR), ao
  contrário de uma SPA pura, isso não acontece via transformIndexHtml do
  Vite, então o @vite-pwa/nuxt exige este componente para registrar o
  manifest do PWA. -->
  <VitePwaManifest />
  <NuxtPage />
</template>
