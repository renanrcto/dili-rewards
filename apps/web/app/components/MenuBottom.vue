<script setup lang="ts">
// Navegação principal do app (Figma: MenuBottom, node 4612:16). Fica fixa no
// rodapé e é renderizada pelo app.vue nas páginas com `bottomMenu: true`.
//
// Os ícones são aplicados como máscara CSS para que a cor venha de
// `currentColor` — assim o item ativo troca de cor sem precisar de uma segunda
// versão de cada SVG.
const items = [
  { to: '/', label: 'Início', icon: 'home', width: 27.5, height: 20.6627 },
  { to: '/historico', label: 'Histórico', icon: 'history', width: 22.1536, height: 22.7 },
  { to: '/loja', label: 'Loja', icon: 'cart', width: 28, height: 26.5 },
  { to: '/perfil', label: 'Perfil', icon: 'profile', width: 19, height: 21 },
];
</script>

<template>
  <nav class="menu-bottom" aria-label="Navegação principal">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      :aria-label="item.label"
      class="menu-bottom__item"
      active-class="menu-bottom__item--active"
    >
      <span
        class="menu-bottom__icon"
        aria-hidden="true"
        :style="{
          width: `${item.width}px`,
          height: `${item.height}px`,
          '--icon': `url(/images/menu/${item.icon}.svg)`,
        }"
      />
    </NuxtLink>
  </nav>
</template>

<style scoped lang="scss">
.menu-bottom {
  position: fixed;
  z-index: 10;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
  transform: translateX(-50%);
  width: 18.75rem;
  height: 4.3125rem;
  padding-inline: 0.25rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  justify-items: center;
  border-radius: 999px;
  background: var(--color-navy-glass);
  color: var(--color-cream);

  &__item {
    width: 3rem;
    height: 3rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    &--active {
      background: var(--color-cream);
      color: var(--color-navy-glass);
    }

    &:focus-visible {
      outline: 2px solid var(--color-cream);
      outline-offset: 2px;
    }
  }

  &__icon {
    display: block;
    background-color: currentColor;
    mask: var(--icon) center / contain no-repeat;
  }
}
</style>
