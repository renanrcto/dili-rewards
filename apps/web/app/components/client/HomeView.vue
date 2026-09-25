<script setup lang="ts">
const { account } = useAuth();
const { getBalance, getTier } = usePoints();

// Sem `await`: a aba aparece na hora e cada parte mostra skeleton até os
// dados chegarem.
const { data: balance, status: balanceStatus } = useAsyncData(
  'points-balance',
  getBalance,
);
const { data: tierStatus, status: tierStatusStatus } = useAsyncData(
  'points-tier',
  getTier,
);

// Em caso de erro, segue mostrando 0 pontos / standard em vez do skeleton.
const isBalanceLoading = computed(
  () => !balance.value && balanceStatus.value !== 'error',
);
const isTierLoading = computed(
  () => !tierStatus.value && tierStatusStatus.value !== 'error',
);

// Se o nível não carregar, mostra standard em vez de esconder o selo.
const tier = computed(() => tierStatus.value?.tier ?? 'standard');

const formattedPoints = computed(() =>
  new Intl.NumberFormat('pt-BR').format(balance.value?.balance ?? 0),
);
</script>

<template>
  <div class="home">
    <header class="home__header">
      <img
        src="/images/logo.svg"
        alt="Dili Cafés Especiais"
        class="home__logo"
        width="128"
        height="95"
      />
      <div v-if="isTierLoading" class="home__tier home__tier--loading">
        <SkeletonBlock width="3.5rem" height="0.95rem" />
        <SkeletonBlock width="4.5rem" height="0.95rem" />
      </div>
      <p v-else class="home__tier" :class="`home__tier--${tier}`">
        <span>cliente</span>
        <span>{{ tier }}</span>
      </p>
    </header>

    <div class="home__greeting">
      <p class="home__greeting-line">
        Você tem
        <span class="home__greeting-accent">disponível</span>
      </p>
      <SkeletonBlock
        v-if="isBalanceLoading"
        class="home__points-skeleton"
        width="10rem"
        height="1.6rem"
      />
      <p v-else class="home__points">{{ formattedPoints }} pontos.</p>
    </div>

    <section class="home__hero" aria-label="Seu cartão de fidelidade Dili">
      <RewardsCard :name="account?.name" class="home__card" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  min-height: calc(100dvh - var(--bottom-menu-space, 0px));
  max-width: 30rem;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: relative;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  &__logo {
    width: 4.5rem;
    height: auto;
    display: block;
  }

  &__tier {
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 500;
    font-style: normal;
    margin: 0.5rem 0 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    line-height: 1.2;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-navy);

    &--loading {
      gap: 0.3rem;
    }

    &--gold,
    &--platinum,
    &--black {
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent; /* Fallback */
    }

    &--gold {
      background-image: var(--tier-gold);
    }

    &--platinum {
      background-image: var(--tier-platinum);
    }

    &--black {
      background-image: var(--tier-black);
    }
  }

  &__greeting {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    /* Aplica o gradiente e faz o recorte no texto */
    background: linear-gradient(
      to right,
      var(--color-navy),
      var(--color-maroon)
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent; /* Fallback */

    &-line {
      margin: 0;
      font-size: 1.05rem;
    }
  }

  &__points {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
  }

  &__points {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-navy);
  }

  // Mesma altura da linha dos pontos (1.4rem × line-height 1.5).
  &__points-skeleton {
    margin-block: 0.25rem;
  }

  &__hero {
    position: relative;
    height: 18.5rem;
    margin-inline: -0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__card {
    position: relative;
    z-index: 1;
  }

  &__cta {
    margin: 0 auto;
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 70%;
    padding: 1rem 1.4rem;
    border-radius: 999px;
    border: 1.5px solid var(--color-navy);
    background: var(--color-navy);
    color: var(--color-cream-high);
    font: inherit;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      background: var(--color-navy);
      color: var(--color-cream-high);
    }

    &:focus-visible {
      outline: 2px solid var(--color-maroon);
      outline-offset: 3px;
    }

    &-icon {
      width: 1.4rem;
      height: 1.4rem;
    }
  }

  &::before {
    content: '';
    position: absolute;
    top: 65px;
    left: 0;
    right: 0;
    margin: auto;
    width: 95%;
    height: 95%;

    background-image: url('/images/beans-bg3.webp');
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;

    opacity: 0.4;
    z-index: -1;
  }
}
</style>
