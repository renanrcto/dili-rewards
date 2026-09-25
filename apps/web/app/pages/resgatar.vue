<script setup lang="ts">
// Destino do QR Code gerado no caixa (/resgatar?code=<uuid>). Sem login, o
// middleware manda para /login e volta para cá depois. Os links de saída usam
// `replace` para o voltar do celular não reabrir o resgate já feito.
definePageMeta({ middleware: 'auth' });

type RedeemState =
  | { status: 'loading' }
  | { status: 'success'; points: number }
  | { status: 'error'; message: string };

const route = useRoute();
const { redeem } = usePoints();

const state = ref<RedeemState>({ status: 'loading' });

const formattedPoints = computed(() =>
  state.value.status === 'success'
    ? new Intl.NumberFormat('pt-BR').format(state.value.points)
    : '',
);

// Só no cliente (onMounted), para o resgate nunca rodar durante o SSR.
onMounted(async () => {
  const code = route.query.code;
  if (typeof code !== 'string' || !code) {
    state.value = {
      status: 'error',
      message: 'QR Code inválido. Peça um novo no caixa.',
    };
    return;
  }

  try {
    const credited = await redeem(code);
    // Força a home e o histórico a buscarem os dados atualizados.
    clearNuxtData(['points-balance', 'points-history', 'points-tier']);
    state.value = { status: 'success', points: credited.points };
  } catch (error) {
    state.value = {
      status: 'error',
      message: extractErrorMessage(
        error,
        'Não foi possível resgatar seus pontos. Tente novamente.',
      ),
    };
  }
});
</script>

<template>
  <div class="redeem" aria-live="polite">
    <img
      src="/images/logo.svg"
      alt="Dili Cafés Especiais"
      class="redeem__logo"
      width="96"
      height="71"
    />

    <template v-if="state.status === 'loading'">
      <span class="redeem__spinner" aria-hidden="true" />
      <p class="redeem__text">Resgatando seus pontos…</p>
    </template>

    <template v-else-if="state.status === 'success'">
      <h1 class="redeem__title">Pontos creditados!</h1>
      <p class="redeem__points">+{{ formattedPoints }} pontos</p>
      <p class="redeem__text">Obrigado por escolher a Dili.</p>
      <NuxtLink to="/" replace class="redeem__button">Ver meus pontos</NuxtLink>
    </template>

    <template v-else>
      <h1 class="redeem__title">Não foi possível resgatar</h1>
      <p class="redeem__error" role="alert">{{ state.message }}</p>
      <NuxtLink to="/" replace class="redeem__button"
        >Voltar ao início</NuxtLink
      >
    </template>
  </div>
</template>

<style scoped lang="scss">
.redeem {
  min-height: 100dvh;
  max-width: 26rem;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  text-align: center;

  &__logo {
    width: 3.5rem;
    height: auto;
    margin-bottom: 1rem;
  }

  &__title {
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1.4rem;
    color: var(--color-navy);
    margin: 0;
  }

  &__points {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    background: linear-gradient(
      to right,
      var(--color-navy),
      var(--color-maroon)
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }

  &__text {
    margin: 0;
    color: var(--color-navy-muted);
  }

  &__error {
    margin: 0;
    color: var(--color-maroon);
    font-weight: 600;
  }

  &__button {
    margin-top: 1rem;
    padding: 1rem 2rem;
    border-radius: 999px;
    background: var(--color-navy);
    color: var(--color-cream-high);
    font-weight: 700;
    text-decoration: none;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.9;
    }

    &:focus-visible {
      outline: 2px solid var(--color-maroon);
      outline-offset: 3px;
    }
  }

  &__spinner {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    border: 3px solid var(--color-navy-soft);
    border-top-color: var(--color-navy);
    animation: redeem-spin 0.8s linear infinite;
  }
}

@keyframes redeem-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .redeem__spinner {
    animation-duration: 2.4s;
  }
}
</style>
