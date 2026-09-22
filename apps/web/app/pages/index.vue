<script setup lang="ts">
const { user } = useAuthUser();

const formattedPoints = computed(() =>
  new Intl.NumberFormat('pt-BR').format(user.value.points),
);

function handleScanQrCode() {
  // TODO: abrir o leitor de QR Code assim que o fluxo de pontuação/resgate
  // via QR estiver implementado.
}
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
      <p class="home__tier">
        <span>cliente</span>
        <span>{{ user.tier.toLowerCase() }}</span>
      </p>
    </header>

    <div class="home__greeting">
      <p class="home__greeting-line">
        Você tem
        <span class="home__greeting-accent">disponível</span>
      </p>
      <p class="home__points">{{ formattedPoints }} pontos.</p>
    </div>

    <section class="home__hero" aria-label="Seu cartão de fidelidade Dili">
      <RewardsCard :name="user.name" class="home__card" />
    </section>

    <button type="button" class="home__cta" @click="handleScanQrCode">
      Ler QR Code
      <svg class="home__cta-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 12h16M14 6l6 6-6 6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped lang="scss">
.home {
  min-height: 100dvh;
  max-width: 30rem;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;

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
    margin: 0.2rem 0 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    line-height: 1.2;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-navy-muted);
  }

  &__greeting {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    &-line {
      margin: 0;
      font-size: 1.05rem;
      color: var(--color-ink);
    }

    &-accent {
      color: var(--color-maroon);
    }
  }

  &__points {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--color-navy);
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 1rem 1.4rem;
    border-radius: 999px;
    border: 1.5px solid var(--color-navy);
    background: transparent;
    color: var(--color-navy);
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

  &::before{
    content: "";
    position: absolute;
    top: -50px;
    left: 0;
    width: 100%;
    height: 100%;
    
    background-image: url('../../public/images/beans-bg.png');
    background-position: center;
    background-repeat: no-repeat;
    background-size: 60%;
    
    opacity: 0.4; 
    z-index: 0;
  }
}

</style>
