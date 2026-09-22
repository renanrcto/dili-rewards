<script setup lang="ts">
defineProps<{
  name: string;
}>();

// Inclinação de repouso do cartão (combina com o protótipo) + inclinação
// máxima que o ponteiro/toque pode adicionar em cada eixo.
const BASE_ROTATION = 7;
const MAX_TILT = 15;

const cardEl = ref<HTMLElement | null>(null);
const tiltX = ref(0);
const tiltY = ref(0);
const isActive = ref(false);

let prefersReducedMotion = false;

onMounted(() => {
  prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
});

function handlePointerMove(event: PointerEvent) {
  if (prefersReducedMotion || !cardEl.value) return;

  const rect = cardEl.value.getBoundingClientRect();
  const relX = (event.clientX - rect.left) / rect.width;
  const relY = (event.clientY - rect.top) / rect.height;

  tiltY.value = (relX - 0.5) * 2 * MAX_TILT;
  tiltX.value = -(relY - 0.5) * 2 * MAX_TILT;
  isActive.value = true;
}

function resetTilt() {
  tiltX.value = 0;
  tiltY.value = 0;
  isActive.value = false;
}

const cardStyle = computed(() => ({
  transform: `perspective(900px) rotate(${BASE_ROTATION}deg) rotateX(${tiltX.value}deg) rotateY(${tiltY.value}deg)`,
}));
</script>

<template>
  <div
    ref="cardEl"
    class="rewards-card"
    :class="{ 'rewards-card--active': isActive }"
    :style="cardStyle"
    @pointermove="handlePointerMove"
    @pointerleave="resetTilt"
    @pointerup="resetTilt"
    @pointercancel="resetTilt"
  >
    <div class="rewards-card__edge" aria-hidden="true" />

    <div class="rewards-card__glass">
      <span class="rewards-card__shine" aria-hidden="true" />
      <span class="rewards-card__grain" aria-hidden="true" />

      <div class="rewards-card__top">
        <span class="rewards-card__badge">
          <svg
            class="rewards-card__sparkle"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 2c.8 5 1 7.5 10 10-9 2.5-9.2 5-10 10-.8-5-1-7.5-10-10 9-2.5 9.2-5 10-10Z"
              fill="currentColor"
            />
          </svg>
          Rewards
        </span>

        <img
          src="/images/logo-single.svg"
          alt=""
          class="rewards-card__mark"
        />
      </div>

      <p class="rewards-card__name">{{ name }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.rewards-card {
  position: relative;
  width: min(21rem, 84vw);
  aspect-ratio: 1.6 / 1;
  /* transform-style: preserve-3d; -> Removido para não quebrar o backdrop-filter */
  will-change: transform;
  cursor: grab;
  touch-action: none;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  /* filter: drop-shadow(...) -> Removido para evitar bugs no Safari/WebKit */

  &--active {
    transition: transform 0.08s linear;
  }

&__edge {
    position: absolute;
    inset: 0; /* Alinha exatamente ao tamanho do vidro */
    border-radius: 1.4rem;
    pointer-events: none;
    
    /* FUNDAMENTAL: O centro transparente permite que o backdrop-filter 
       do elemento da frente enxergue e borre o fundo do site */
    background: transparent;
    
    /* Empilhamento de sombras para simular a extrusão/espessura 3D */
    box-shadow: 
      /* Reflexo de luz na quina superior/esquerda (dá o aspecto de vidro polido) */
      -1px -1px 0px rgba(255, 255, 255, 0.3),
      
      /* Camadas de espessura (extrudando o bloco para baixo e para a direita) */
      1px 1px 0px rgba(40, 55, 74, 0.15),
      2px 2px 0px rgba(40, 55, 74, 0.15),
      3px 4px 0px rgba(40, 55, 74, 0.18),
      4px 6px 0px rgba(40, 55, 74, 0.22),
      
      /* Sombra projetada tradicional para descolar o cartão do fundo */
      8px 12px 24px rgba(40, 55, 74, 0.15),
      12px 24px 48px rgba(40, 55, 74, 0.12);
  }

&__glass {
    position: absolute;
    inset: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.4rem 1.6rem;
    border-radius: 1.4rem;
    
    /* Borda sutil e semi-transparente simulando o corte do vidro */
    border: 1px solid rgba(40, 55, 74, 0.2);
    
    /* Fundo quase imperceptível. Deixamos de usar branco forte 
       e usamos apenas um traço (8% a 1%) para dar o volume */
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.01) 100%
    );
    
    /* A mágica do liquid glass: desfoque forte + saturação alta (180% a 200%).
       A saturação alta compensa a remoção do branco e dá aquele aspecto "vibrante" */
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
    
    /* Reflexos internos do vidro. Em vez de uma sombra escura, 
       usamos brilhos brancos nas quinas para simular o polimento do material */
    box-shadow:
      inset 1px 1px 3px rgba(255, 255, 255, 0.4),   /* Reflexo forte no topo/esquerda */
      inset -1px -1px 3px rgba(255, 255, 255, 0.05), /* Reflexo fraco em baixo/direita */
      inset 0 0 3rem rgba(255, 255, 255, 0.03);      /* Leve preenchimento de luz no centro */
  }

  /* Vamos aproveitar esse elemento que você já tem no HTML para criar
     um reflexo de luz dinâmico (glare) atravessando a lente */
  &__shine {
    position: absolute;
    top: 0;
    left: -150%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.3), /* Feixe de luz intenso no meio */
      transparent
    );
    transform: skewX(-25deg);
    transition: left 0.8s ease-out;
    pointer-events: none;
    mix-blend-mode: overlay;
  }

  /* Quando o JS ativa a classe ao mover o mouse, a luz cruza o vidro */
  &--active &__shine {
    left: 150%;
    transition: left 1s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &__grain {
    position: absolute;
    inset: 0;
    opacity: 0.08; /* Aumentado um pouco para dar mais textura realística de vidro jateado */
    mix-blend-mode: overlay;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px 180px;
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--color-maroon);
  }

  &__sparkle {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--color-maroon);
  }

  &__mark {
    width: 1.85rem;
    height: auto;
    flex-shrink: 0;
  }

  &__name {
    align-self: flex-start;
    margin: 0;
    font-weight: 300;
    font-size: 1.05rem;
    color: var(--color-maroon);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rewards-card {
    transition: none;
  }
}
</style>
