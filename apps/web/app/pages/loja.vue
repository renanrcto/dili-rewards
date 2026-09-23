<script setup lang="ts">
definePageMeta({ middleware: 'auth', bottomMenu: true });
</script>

<template>
  <div class="store">
    <header class="store__header">
      <h1 class="store__title">Troca de Pontos</h1>
    </header>

    <section class="store__soon">
      <div class="store__icon" aria-hidden="true">
        <svg viewBox="0 0 28 26.5">
          <path
            d="M27.25 18.75H13.8751C12.5173 18.75 11.3287 17.838 10.9773 16.5265L10.6353 15.25L7.3458 2.97354C6.99437 1.66199 5.80584 0.75 4.44802 0.75H0.75M10.6353 15.25H21.6487C22.9102 15.25 24.037 14.4608 24.4681 13.2752L26.2863 8.27523C26.9978 6.31868 25.5488 4.25 23.4669 4.25H11.75M12.75 7.25H23.25M13.75 11.25H21.75M12.25 23.75C12.25 22.55 13.05 21.75 14.25 21.75C15.45 21.75 16.25 22.55 16.25 23.75C16.25 24.95 15.45 25.75 14.25 25.75C13.05 25.75 12.25 24.95 12.25 23.75ZM23.25 23.75C23.25 22.55 24.05 21.75 25.25 21.75C26.45 21.75 27.25 22.55 27.25 23.75C27.25 24.95 26.45 25.75 25.25 25.75C24.05 25.75 23.25 24.95 23.25 23.75Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <p class="store__soon-title">Em breve</p>
      <p class="store__soon-text">
        Em breve você poderá ver aqui os produtos disponíveis para trocar
        pelos seus pontos.
      </p>
    </section>
  </div>
</template>

<style scoped lang="scss">
.store {
  min-height: calc(100dvh - var(--bottom-menu-space, 0px));
  max-width: 30rem;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  color: var(--color-navy);

  &__title {
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1.4rem;
    margin: 0;
    background: linear-gradient(
      to right,
      var(--color-navy),
      var(--color-maroon)
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    justify-self: start;
    width: fit-content;
  }

  &__soon {
    margin: auto 0;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
    border-radius: 1.2rem;
    background: var(--color-cream-high);
    border: 1.5px solid var(--color-navy-soft);

    &-title {
      margin: 0;
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--color-navy);
    }

    &-text {
      margin: 0;
      max-width: 20rem;
      color: var(--color-navy-muted);
      line-height: 1.5;
    }
  }

  &__icon {
    width: 4rem;
    height: 4rem;
    margin-bottom: 0.5rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--color-navy-soft);
    color: var(--color-navy);

    svg {
      width: 1.9rem;
      height: 1.9rem;
    }
  }
}
</style>
