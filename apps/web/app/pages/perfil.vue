<script setup lang="ts">
definePageMeta({ middleware: 'auth', bottomMenu: true });

const { account, logout } = useAuth();

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

    <dl class="profile__info">
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
