<script setup lang="ts">
// Bloco de carregamento padrão do app: ocupa o lugar do conteúdo enquanto os
// dados chegam, com o mesmo tamanho, para a tela não "pular" quando carregar.
// O app/spa-loading-template.html repete este visual em HTML puro para a
// abertura do app, antes do JavaScript carregar.
withDefaults(
  defineProps<{
    width?: string;
    height?: string;
    radius?: string;
  }>(),
  { width: '100%', height: '1rem', radius: '0.5rem' },
);
</script>

<template>
  <span
    class="skeleton"
    aria-hidden="true"
    :style="{ width, height, borderRadius: radius }"
  />
</template>

<style scoped lang="scss">
.skeleton {
  display: block;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  max-width: 100%;
  background: var(--color-skeleton);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent,
      var(--color-skeleton-shine),
      transparent
    );
    animation: skeleton-shimmer 1.4s ease-in-out infinite;
  }
}

@keyframes skeleton-shimmer {
  to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton::after {
    animation: none;
    opacity: 0;
  }
}
</style>
