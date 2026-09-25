<script setup lang="ts">
const { account, logout } = useAuth();
const { getTier } = usePoints();

// Mesma chave da home: o cache é compartilhado e invalidado no resgate.
const { data: tierStatus, error: tierError } = useAsyncData(
  'points-tier',
  getTier,
);

const isTierLoading = computed(() => !tierStatus.value && !tierError.value);

// Na página de perfil o nome aparece sempre completo.
const displayName = computed(() =>
  formatDisplayName(account.value?.name ?? '', Infinity),
);

const memberSince = computed(() => {
  const createdAt = account.value?.createdAt;
  if (!createdAt) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(createdAt));
});

const integer = new Intl.NumberFormat('pt-BR');
// "80 mil pontos" em vez de "80.001 pontos" a partir de 10 mil.
const compact = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function formatPoints(value: number) {
  return value >= 10_000 ? compact.format(value) : integer.format(value);
}

const nextTier = computed(() => tierStatus.value?.next ?? null);

// Como basta um dos critérios, o progresso é o do mais adiantado.
const progress = computed(() => {
  const status = tierStatus.value;
  if (!status) return 0;
  if (!status.next) return 1;
  const { visitsRequired, pointsRequired } = status.next;
  return Math.min(
    1,
    Math.max(status.visits / visitsRequired, status.points / pointsRequired),
  );
});

const progressMessage = computed(() => {
  const next = nextTier.value;
  if (!next) return 'Você está no nível máximo do Dili Rewards.';

  const visits = `${next.visitsMissing} ${
    next.visitsMissing === 1 ? 'visita' : 'visitas'
  }`;
  const points = `${formatPoints(next.pointsMissing)} pontos`;
  return `Com mais ${visits} ou mais ${points} você vira cliente ${next.tier}.`;
});

const lockedUntil = computed(() => {
  const value = tierStatus.value?.lockedUntil;
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
});

async function handleLogout() {
  logout();
  await navigateTo('/login', { replace: true });
}
</script>

<template>
  <div class="profile">
    <header class="profile__header">
      <h1 class="profile__title">Perfil</h1>
    </header>

    <!-- A conta ainda pode estar chegando (/auth/me) ao abrir o app. -->
    <dl v-if="!account" class="profile__info" aria-busy="true">
      <div
        v-for="label in ['Nome', 'E-mail', 'Membro desde']"
        :key="label"
        class="profile__row"
      >
        <dt class="profile__label">{{ label }}</dt>
        <dd class="profile__value">
          <SkeletonBlock width="60%" height="1.2rem" />
        </dd>
      </div>
    </dl>

    <dl v-else class="profile__info">
      <div class="profile__row">
        <dt class="profile__label">Nome</dt>
        <dd class="profile__value">{{ displayName }}</dd>
      </div>

      <div class="profile__row">
        <dt class="profile__label">E-mail</dt>
        <dd class="profile__value profile__value--break">
          {{ account?.email }}
        </dd>
      </div>

      <div v-if="memberSince" class="profile__row">
        <dt class="profile__label">Membro desde</dt>
        <dd class="profile__value">{{ memberSince }}</dd>
      </div>
    </dl>

    <section v-if="isTierLoading" class="profile__tier" aria-busy="true">
      <div class="profile__tier-header">
        <h2 class="profile__label">Seu nível</h2>
        <SkeletonBlock width="7rem" height="1.3rem" />
      </div>
      <SkeletonBlock height="0.6rem" radius="999px" />
      <SkeletonBlock width="90%" height="1rem" />
      <SkeletonBlock width="70%" height="1rem" />
    </section>

    <section
      v-else-if="tierStatus"
      class="profile__tier"
      aria-labelledby="profile-tier-title"
    >
      <div class="profile__tier-header">
        <h2 id="profile-tier-title" class="profile__label">Seu nível</h2>
        <p
          class="profile__tier-name"
          :class="`profile__tier-name--${tierStatus.tier}`"
        >
          cliente {{ tierStatus.tier }}
        </p>
      </div>

      <div
        class="profile__progress"
        role="progressbar"
        :aria-valuenow="Math.round(progress * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="
          nextTier
            ? `Progresso para cliente ${nextTier.tier}`
            : 'Nível máximo atingido'
        "
      >
        <span
          class="profile__progress-fill"
          :class="`profile__progress-fill--${nextTier?.tier ?? tierStatus.tier}`"
          :style="{ width: `${progress * 100}%` }"
        />
      </div>

      <p class="profile__tier-message">{{ progressMessage }}</p>

      <p
        v-if="nextTier || tierStatus.source === 'manual' || lockedUntil"
        class="profile__tier-note"
      >
        <template v-if="nextTier">
          Você tem {{ tierStatus.visits }}
          {{ tierStatus.visits === 1 ? 'visita' : 'visitas' }} e
          {{ integer.format(tierStatus.points) }} pontos nos últimos 2 meses.
        </template>
        <template v-if="tierStatus.source === 'manual'">
          Nível concedido pela Dili.
        </template>
        <template v-else-if="lockedUntil">
          Seu nível {{ tierStatus.tier }} está garantido até {{ lockedUntil }}.
        </template>
      </p>
    </section>

    <button type="button" class="profile__logout" @click="handleLogout">
      Sair da conta
    </button>
  </div>
</template>

<style scoped lang="scss">
.profile {
  min-height: calc(100dvh - var(--bottom-menu-space, 0px));
  max-width: 30rem;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;

  &__title {
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1.4rem;
    color: var(--color-navy);
    margin: 0;
  }

  &__info {
    margin: 0;
    display: flex;
    flex-direction: column;
    border-radius: 1.2rem;
    border: 1.5px solid var(--color-navy-soft);
    background: var(--color-cream-high);
  }

  &__row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem 1.2rem;

    & + & {
      border-top: 1px solid var(--color-navy-soft);
    }
  }

  &__label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-navy-muted);
  }

  &__value {
    margin: 0;
    font-size: 1rem;
    color: var(--color-ink);

    &--break {
      overflow-wrap: anywhere;
    }
  }

  &__tier {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.2rem 1.2rem;
    border-radius: 1.2rem;
    border: 1.5px solid var(--color-navy-soft);
    background: var(--color-cream-high);
  }

  &__tier-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;

    .profile__label {
      margin: 0;
    }
  }

  &__tier-name {
    margin: 0;
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--color-navy);

    &--gold,
    &--platinum,
    &--black {
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
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

  &__progress {
    height: 0.6rem;
    border-radius: 999px;
    background: var(--color-navy-soft);
    overflow: hidden;
  }

  &__progress-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--color-navy);
    transition: width 0.4s ease;

    &--gold {
      background: var(--tier-gold);
    }

    &--platinum {
      background: var(--tier-platinum);
    }

    &--black {
      background: var(--tier-black);
    }
  }

  &__tier-message {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-ink);
  }

  &__tier-note {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-navy-muted);
  }

  &__logout {
    margin-top: auto;
    padding: 1rem 1.4rem;
    border-radius: 999px;
    border: 1.5px solid var(--color-maroon);
    background: transparent;
    color: var(--color-maroon);
    font: inherit;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      background: var(--color-maroon);
      color: var(--color-cream-high);
    }

    &:focus-visible {
      outline: 2px solid var(--color-navy);
      outline-offset: 3px;
    }
  }
}
</style>
