<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const { account } = useAuth();
const { getBalance } = usePoints();

// TODO: tier ainda não vem de um backend de fidelidade — troque por dado
// real assim que esse serviço existir.
const tier = 'Bronze';

const { data: balance } = await useAsyncData('points-balance', getBalance);

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
      <p class="home__tier">
        <span>cliente</span>
        <span>{{ tier.toLowerCase() }}</span>
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
      <RewardsCard :name="account?.name ?? ''" class="home__card" />
    </section>
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
    font-family: "Montserrat Alternates", sans-serif;
    font-weight: 500;
    font-style: normal;
    margin: 0.2rem 0 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    line-height: 1.2;
    font-weight: 600;
    font-size: 0.95rem;
    background: linear-gradient(to right, #CACACA, #9C9C9C);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent; /* Fallback */
  }

&__greeting {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    /* Aplica o gradiente e faz o recorte no texto */
    background: linear-gradient(to right, var(--color-navy), var(--color-maroon));
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

  &::before{
    content: "";
    position: absolute;
    top: -50px;
    left: 0;
    width: 100%;
    height: 100%;
    
    background-image: url('../../public/images/beans-bg3.webp');
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    
    opacity: 0.4; 
    z-index: -1;
  }
}

</style>
