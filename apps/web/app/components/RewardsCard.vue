<script setup lang="ts">
const props = defineProps<{
  // Sem nome (conta ainda carregando), mostra um skeleton no lugar.
  name?: string;
}>();

// Acima disso o nome não cabe numa linha do cartão; mostramos só
// primeiro e último nome.
const MAX_NAME_LENGTH = 24;

const displayName = computed(() =>
  props.name ? formatDisplayName(props.name, MAX_NAME_LENGTH) : '',
);

// Inclinação de repouso do cartão (combina com o protótipo) + inclinação
// máxima que o ponteiro/toque pode adicionar em cada eixo.
const BASE_ROTATION = 7;
const MAX_TILT = 15;

// Movimento de repouso: o cartão balança devagar sozinho, para ficar claro
// que ele reage ao toque. Períodos diferentes em cada eixo evitam que o
// movimento pareça um loop mecânico.
const IDLE_TILT_X = 4;
const IDLE_TILT_Y = 6;
const IDLE_FLOAT_PX = 4;
const IDLE_PERIOD_X_MS = 7000;
const IDLE_PERIOD_Y_MS = 9000;
const IDLE_PERIOD_FLOAT_MS = 6000;

// Quanto o cartão anda em direção ao alvo a cada quadro (a 60 fps): rápido
// para seguir o dedo, lento para voltar ao balanço ao soltar.
const FOLLOW_POINTER = 0.3;
const FOLLOW_IDLE = 0.06;

const FRAME_MS = 1000 / 60;

interface Pose {
  tiltX: number;
  tiltY: number;
  lift: number;
}

const cardEl = ref<HTMLElement | null>(null);
// Muda a cada toque para reiniciar a varredura de brilho e o sparkle.
const sweepKey = ref(0);

let prefersReducedMotion = false;
let pointerPose: Pose | null = null;
const pose: Pose = { tiltX: 0, tiltY: 0, lift: 0 };
let frameId = 0;
let lastFrameTime = 0;

function idlePose(time: number): Pose {
  const wave = (period: number, phase = 0) =>
    Math.sin((time / period) * 2 * Math.PI + phase);
  return {
    tiltX: IDLE_TILT_X * wave(IDLE_PERIOD_X_MS),
    tiltY: IDLE_TILT_Y * wave(IDLE_PERIOD_Y_MS, 1),
    lift: -IDLE_FLOAT_PX * (0.5 + 0.5 * wave(IDLE_PERIOD_FLOAT_MS)),
  };
}

// Escreve direto no DOM a cada quadro, sem passar pela reatividade do Vue.
function renderFrame(time: number) {
  const el = cardEl.value;
  if (!el) return;

  const elapsed = lastFrameTime
    ? Math.min(time - lastFrameTime, 100)
    : FRAME_MS;
  lastFrameTime = time;

  const target = pointerPose ?? idlePose(time);
  const speed = pointerPose ? FOLLOW_POINTER : FOLLOW_IDLE;
  const follow = 1 - Math.pow(1 - speed, elapsed / FRAME_MS);

  pose.tiltX += (target.tiltX - pose.tiltX) * follow;
  pose.tiltY += (target.tiltY - pose.tiltY) * follow;
  pose.lift += (target.lift - pose.lift) * follow;

  el.style.transform = `perspective(900px) translateY(${pose.lift}px) rotate(${BASE_ROTATION}deg) rotateX(${pose.tiltX}deg) rotateY(${pose.tiltY}deg)`;
  // O reflexo acompanha a inclinação, como a luz batendo no vidro.
  el.style.setProperty('--glare-x', `${50 + (pose.tiltY / MAX_TILT) * 50}%`);
  el.style.setProperty('--glare-y', `${50 - (pose.tiltX / MAX_TILT) * 50}%`);

  frameId = requestAnimationFrame(renderFrame);
}

function startMotion() {
  if (prefersReducedMotion || frameId) return;
  lastFrameTime = 0;
  frameId = requestAnimationFrame(renderFrame);
}

function stopMotion() {
  cancelAnimationFrame(frameId);
  frameId = 0;
}

onMounted(() => {
  prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  startMotion();
});
// A home fica em <KeepAlive>: pausa o loop enquanto outra aba está aberta.
onActivated(startMotion);
onDeactivated(stopMotion);
onBeforeUnmount(stopMotion);

function handlePointerEnter() {
  if (prefersReducedMotion) return;
  sweepKey.value++;
}

function handlePointerMove(event: PointerEvent) {
  if (prefersReducedMotion || !cardEl.value) return;

  const rect = cardEl.value.getBoundingClientRect();
  const relX = (event.clientX - rect.left) / rect.width;
  const relY = (event.clientY - rect.top) / rect.height;

  pointerPose = {
    tiltX: -(relY - 0.5) * 2 * MAX_TILT,
    tiltY: (relX - 0.5) * 2 * MAX_TILT,
    lift: 0,
  };
}

function resetTilt() {
  pointerPose = null;
}

// Depois de um toque, a varredura começa na hora em vez de esperar o atraso
// inicial da animação.
const sweepStyle = computed(() =>
  sweepKey.value ? { animationDelay: '0s' } : undefined,
);
</script>

<template>
  <div
    ref="cardEl"
    class="rewards-card"
    @pointerenter="handlePointerEnter"
    @pointermove="handlePointerMove"
    @pointerleave="resetTilt"
    @pointerup="resetTilt"
    @pointercancel="resetTilt"
  >
    <div class="rewards-card__edge" aria-hidden="true" />

    <div class="rewards-card__glass">
      <span class="rewards-card__glare" aria-hidden="true" />
      <span
        :key="`shine-${sweepKey}`"
        class="rewards-card__shine"
        :style="sweepStyle"
        aria-hidden="true"
      />
      <span class="rewards-card__grain" aria-hidden="true" />

      <!-- Brilhos que acendem quando a varredura passa por eles. -->
      <svg
        v-for="glint in 2"
        :key="`glint-${glint}-${sweepKey}`"
        class="rewards-card__glint"
        :class="`rewards-card__glint--${glint}`"
        :style="sweepStyle"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M12 2c.8 5 1 7.5 10 10-9 2.5-9.2 5-10 10-.8-5-1-7.5-10-10 9-2.5 9.2-5 10-10Z"
          fill="currentColor"
        />
      </svg>

      <div class="rewards-card__top">
        <span class="rewards-card__badge">
          <svg
            :key="`sparkle-${sweepKey}`"
            class="rewards-card__sparkle"
            :style="sweepStyle"
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

        <img src="/images/logo-single.svg" alt="" class="rewards-card__mark" />
      </div>

      <p v-if="displayName" class="rewards-card__name">{{ displayName }}</p>
      <SkeletonBlock
        v-else
        class="rewards-card__name"
        width="9rem"
        height="1.1rem"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
// Ciclo da varredura de brilho + sparkle, e o atraso da primeira passada
// depois que o cartão aparece.
$sweep-cycle: 6.5s;
$sweep-delay: 1.2s;

.rewards-card {
  position: relative;
  width: min(21rem, 84vw);
  aspect-ratio: 1.6 / 1;
  /* transform-style: preserve-3d; -> Removido para não quebrar o backdrop-filter */
  // Pose de repouso; com movimento liberado, o loop do script assume o
  // transform a cada quadro (e já suaviza as transições).
  transform: perspective(900px) rotate(7deg);
  will-change: transform;
  cursor: grab;
  touch-action: none;
  /* filter: drop-shadow(...) -> Removido para evitar bugs no Safari/WebKit */

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
      /* Sombra projetada tradicional para descolar o cartão do fundo */ 8px
        12px 24px rgba(40, 55, 74, 0.15),
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
      inset 1px 1px 3px rgba(255, 255, 255, 0.4),
      /* Reflexo forte no topo/esquerda */ inset -1px -1px 3px
        rgba(255, 255, 255, 0.05),
      /* Reflexo fraco em baixo/direita */ inset 0 0 3rem
        rgba(255, 255, 255, 0.03); /* Leve preenchimento de luz no centro */
  }

  /* Reflexo suave que segue a inclinação (--glare-x/--glare-y vêm do
     script), como a luz de um ponto fixo batendo no vidro */
  &__glare {
    position: absolute;
    inset: 0;
    pointer-events: none;
    mix-blend-mode: overlay;
    background: radial-gradient(
      circle at var(--glare-x, 35%) var(--glare-y, 25%),
      rgba(255, 255, 255, 0.45),
      transparent 60%
    );
  }

  /* Feixe de luz que atravessa a lente de tempos em tempos (e na hora,
     quando o cartão é tocado). Em transform, e não em left, para não
     recalcular layout a cada quadro. 300% da própria largura = 150% do
     cartão. */
  &__shine {
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    // Feixe de luz intenso no meio. Sem mix-blend-mode: em overlay, branco
    // sobre o cartão claro praticamente some.
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.75),
      transparent
    );
    transform: translateX(-300%) skewX(-25deg);
    animation: card-shine $sweep-cycle ease-in-out $sweep-delay infinite;
    pointer-events: none;
  }

  &__glint {
    position: absolute;
    width: 0.8rem;
    height: 0.8rem;
    color: var(--color-maroon);
    opacity: 0;
    pointer-events: none;
    animation: card-glint $sweep-cycle ease-out $sweep-delay infinite;

    &--1 {
      top: 30%;
      left: 58%;
      animation-name: card-glint-early;
    }

    &--2 {
      top: 64%;
      left: 84%;
      width: 0.6rem;
      height: 0.6rem;
    }
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
    animation: card-sparkle $sweep-cycle ease-in-out $sweep-delay infinite;
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

// Todos os tempos abaixo são frações de um ciclo: o feixe cruza o cartão
// nos primeiros ~22% e o sparkle/brilhos acendem quando ele passa por cima
// (selo ~12%, brilho do meio ~14%, brilho da direita ~16%).
@keyframes card-shine {
  0% {
    transform: translateX(-300%) skewX(-25deg);
  }
  22%,
  100% {
    transform: translateX(300%) skewX(-25deg);
  }
}

// A estrela tem simetria de 90°, então terminar em 90deg emenda sem salto.
@keyframes card-sparkle {
  0%,
  7% {
    transform: scale(1) rotate(0deg);
    filter: none;
  }
  12% {
    transform: scale(1.35) rotate(45deg);
    filter: drop-shadow(0 0 0.3rem rgb(151 35 44 / 55%));
  }
  18%,
  100% {
    transform: scale(1) rotate(90deg);
    filter: none;
  }
}

@keyframes card-glint-early {
  0%,
  11% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  14% {
    opacity: 0.7;
    transform: scale(1) rotate(45deg);
  }
  18%,
  100% {
    opacity: 0;
    transform: scale(0) rotate(90deg);
  }
}

@keyframes card-glint {
  0%,
  13% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  16% {
    opacity: 0.7;
    transform: scale(1) rotate(45deg);
  }
  20%,
  100% {
    opacity: 0;
    transform: scale(0) rotate(90deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rewards-card__shine,
  .rewards-card__sparkle,
  .rewards-card__glint {
    animation: none;
  }
}
</style>
