<script setup lang="ts">
import { toast } from 'vue-sonner';
import type { AdminUser, UserStatusFilter } from '~/composables/useAdmin';
import type { AuthAccountRole } from '~/composables/useAuth';

// Contas do programa (somente super-admin): consulta e bloqueio manual, para
// casos de uso indevido dos QR Codes ou de pontos acumulados de terceiros.
definePageMeta({ middleware: ['auth', 'super-admin'] });

const STORE_TIME_ZONE = 'America/Sao_Paulo';
// Espera o super-admin parar de digitar antes de buscar.
const SEARCH_DEBOUNCE_MS = 350;

const ROLE_LABELS: Record<AuthAccountRole, string> = {
  customer: 'Cliente',
  admin: 'Admin',
  super_admin: 'Super-admin',
};

const { account } = useAuth();
const { getUsers, blockUser, unblockUser } = useAdmin();

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: STORE_TIME_ZONE,
});
const integer = new Intl.NumberFormat('pt-BR');

const searchInput = ref('');
const filter = reactive({
  search: '',
  status: '' as UserStatusFilter | '',
});
const page = ref(1);

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filter.search = value.trim();
  }, SEARCH_DEBOUNCE_MS);
});
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

// Mudar um filtro volta para a primeira página.
watch(filter, () => {
  page.value = 1;
});

const { data, error, status, refresh } = useAsyncData(
  'admin-users',
  () =>
    getUsers({
      search: filter.search || undefined,
      status: filter.status || undefined,
      page: page.value,
    }),
  { watch: [filter, page] },
);

const isLoading = computed(() => !data.value && !error.value);

function goToPage(target: number) {
  page.value = target;
  window.scrollTo({ top: 0 });
}

// ---- Bloqueio ----

// Conta com o formulário de bloqueio aberto (um por vez).
const blockingId = ref<string | null>(null);
const blockReason = ref('');
const blockError = ref('');
const savingId = ref<string | null>(null);

// A API recusa bloquear a própria conta ou outro super-admin.
function canBlock(user: AdminUser) {
  return user.role !== 'super_admin' && user.id !== account.value?.id;
}

function openBlockForm(user: AdminUser) {
  blockingId.value = user.id;
  blockReason.value = '';
  blockError.value = '';
}

function closeBlockForm() {
  blockingId.value = null;
}

function replaceUser(updated: AdminUser) {
  if (!data.value) return;
  data.value = {
    ...data.value,
    items: data.value.items.map((user) =>
      user.id === updated.id ? updated : user,
    ),
  };
}

async function handleBlock(user: AdminUser) {
  const reason = blockReason.value.trim();
  if (reason.length < 3) {
    blockError.value = 'Descreva o motivo do bloqueio.';
    return;
  }
  savingId.value = user.id;
  blockError.value = '';
  try {
    replaceUser(await blockUser(user.id, reason));
    closeBlockForm();
    toast.success(`Conta de ${user.name} bloqueada.`);
  } catch (err) {
    blockError.value = extractErrorMessage(
      err,
      'Não foi possível bloquear a conta.',
    );
  } finally {
    savingId.value = null;
  }
}

async function handleUnblock(user: AdminUser) {
  savingId.value = user.id;
  try {
    replaceUser(await unblockUser(user.id));
    toast.success(`Conta de ${user.name} desbloqueada.`);
  } catch (err) {
    toast.error(
      extractErrorMessage(err, 'Não foi possível desbloquear a conta.'),
    );
  } finally {
    savingId.value = null;
  }
}
</script>

<template>
  <div class="users">
    <header class="users__header">
      <img
        src="/images/logo-single.svg"
        alt="Dili Cafés Especiais"
        class="users__logo"
        width="40"
        height="40"
      />
      <div class="users__heading">
        <h1 class="users__title">Usuários</h1>
        <p class="users__subtitle">Contas do programa e bloqueios</p>
      </div>
      <NuxtLink to="/admin" class="users__button">Voltar ao painel</NuxtLink>
    </header>

    <section class="users__card" aria-labelledby="filters-title">
      <h2 id="filters-title" class="visually-hidden">Filtros</h2>
      <div class="users__filters">
        <label class="users__field">
          <span class="users__label">Buscar</span>
          <input
            v-model="searchInput"
            type="search"
            class="users__input"
            placeholder="Nome ou e-mail"
            autocomplete="off"
          />
        </label>
        <label class="users__field">
          <span class="users__label">Situação</span>
          <select v-model="filter.status" class="users__input">
            <option value="">Todas</option>
            <option value="pending">E-mail pendente</option>
            <option value="blocked">Bloqueadas</option>
          </select>
        </label>
      </div>
    </section>

    <section
      class="users__card"
      aria-labelledby="list-title"
      aria-live="polite"
    >
      <div class="users__card-header">
        <h2 id="list-title" class="users__card-title">Contas</h2>
        <SkeletonBlock v-if="isLoading" width="5rem" height="0.9rem" />
        <p v-else-if="data" class="users__count">
          {{ integer.format(data.total) }}
          {{ data.total === 1 ? 'conta' : 'contas' }}
        </p>
      </div>

      <div v-if="isLoading" class="users__loading" aria-busy="true">
        <SkeletonBlock v-for="row in 5" :key="row" height="4rem" />
      </div>

      <p v-else-if="error" class="users__error" role="alert">
        Não foi possível carregar os usuários.
        <button type="button" class="users__link" @click="refresh()">
          Tentar novamente
        </button>
      </p>

      <template v-else-if="data">
        <p v-if="!data.items.length" class="users__empty">
          Nenhuma conta encontrada.
        </p>

        <ul
          v-else
          class="users__list"
          :class="{ 'users__list--loading': status === 'pending' }"
        >
          <li
            v-for="user in data.items"
            :key="user.id"
            class="users__item"
            :class="{ 'users__item--blocked': user.blockedAt }"
          >
            <div class="users__main">
              <p class="users__name">{{ user.name }}</p>
              <p class="users__email">{{ user.email }}</p>
              <div class="users__tags">
                <span v-if="user.role !== 'customer'" class="users__tag">
                  {{ ROLE_LABELS[user.role] }}
                </span>
                <span
                  v-if="!user.emailVerified"
                  class="users__tag users__tag--pending"
                >
                  E-mail pendente
                </span>
                <span
                  v-if="user.blockedAt"
                  class="users__tag users__tag--blocked"
                >
                  Bloqueada
                </span>
                <span class="users__since">
                  desde {{ dateFormat.format(new Date(user.createdAt)) }}
                </span>
              </div>

              <p v-if="user.blockedAt" class="users__block-info">
                Bloqueada em
                {{ dateFormat.format(new Date(user.blockedAt)) }}
                <template v-if="user.blockedByName">
                  por {{ user.blockedByName }}</template
                >: {{ user.blockedReason }}
              </p>
            </div>

            <div class="users__actions">
              <button
                v-if="user.blockedAt"
                type="button"
                class="users__button users__button--small"
                :disabled="savingId === user.id"
                @click="handleUnblock(user)"
              >
                Desbloquear
              </button>
              <button
                v-else-if="canBlock(user) && blockingId !== user.id"
                type="button"
                class="users__button users__button--small users__button--danger"
                @click="openBlockForm(user)"
              >
                Bloquear
              </button>
            </div>

            <form
              v-if="blockingId === user.id"
              class="users__block-form"
              @submit.prevent="handleBlock(user)"
            >
              <label class="users__field">
                <span class="users__label">Motivo do bloqueio</span>
                <textarea
                  v-model="blockReason"
                  class="users__input users__textarea"
                  rows="2"
                  maxlength="500"
                  placeholder="Ex.: resgatou QR Codes de compras de outros clientes"
                />
              </label>
              <p class="users__hint">
                A conta sai do app na hora e não consegue entrar de novo até ser
                desbloqueada.
              </p>
              <p v-if="blockError" class="users__error" role="alert">
                {{ blockError }}
              </p>
              <div class="users__form-actions">
                <button
                  type="button"
                  class="users__button users__button--small"
                  @click="closeBlockForm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="users__button users__button--small users__button--danger-solid"
                  :disabled="savingId === user.id"
                >
                  {{ savingId === user.id ? 'Bloqueando…' : 'Bloquear conta' }}
                </button>
              </div>
            </form>
          </li>
        </ul>

        <nav
          v-if="data.totalPages > 1"
          class="users__pagination"
          aria-label="Paginação"
        >
          <button
            type="button"
            class="users__button"
            :disabled="page <= 1 || status === 'pending'"
            @click="goToPage(page - 1)"
          >
            Anterior
          </button>
          <span>Página {{ data.page }} de {{ data.totalPages }}</span>
          <button
            type="button"
            class="users__button"
            :disabled="page >= data.totalPages || status === 'pending'"
            @click="goToPage(page + 1)"
          >
            Próxima
          </button>
        </nav>
      </template>
    </section>
  </div>
</template>

<style scoped lang="scss">
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.users {
  min-height: 100dvh;
  max-width: 56rem;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
  }

  &__logo {
    width: 2.5rem;
    height: auto;
  }

  &__heading {
    flex: 1;
    min-width: 10rem;
  }

  &__title {
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1.35rem;
    color: var(--color-navy);
    margin: 0;
  }

  &__subtitle,
  &__count {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-navy-muted);
  }

  &__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.7rem 1.2rem;
    border-radius: 999px;
    border: 1.5px solid var(--color-navy);
    background: transparent;
    color: var(--color-navy);
    font: inherit;
    font-weight: 700;
    font-size: 0.95rem;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &--small {
      padding: 0.45rem 0.95rem;
      font-size: 0.85rem;
    }

    &--danger {
      border-color: var(--color-maroon);
      color: var(--color-maroon);
    }

    &--danger-solid {
      border-color: var(--color-maroon);
      background: var(--color-maroon);
      color: var(--color-cream-high);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:not(:disabled):hover {
      opacity: 0.9;
    }

    &:focus-visible {
      outline: 2px solid var(--color-maroon);
      outline-offset: 3px;
    }
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    padding: 1.25rem;
    border-radius: 1.25rem;
    background: var(--color-cream-high);
    box-shadow: 0 0.5rem 1.5rem var(--color-navy-soft);
  }

  &__card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__card-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-navy);
  }

  &__filters {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-navy-muted);
  }

  &__input {
    font: inherit;
    font-size: 1rem;
    padding: 0.7rem 0.9rem;
    border-radius: 0.8rem;
    border: 1.5px solid var(--color-navy-soft);
    background: var(--color-cream);
    color: var(--color-ink);
    outline: none;
    min-width: 0;
    transition: border-color 0.2s ease;

    &:focus-visible {
      border-color: var(--color-navy);
    }
  }

  &__textarea {
    resize: vertical;
    background: var(--color-cream-high);
  }

  &__loading {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: opacity 0.2s ease;

    &--loading {
      opacity: 0.5;
    }
  }

  &__item {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.9rem;
    border-radius: 0.9rem;
    background: var(--color-cream);

    &--blocked {
      box-shadow: inset 3px 0 0 var(--color-maroon);
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__name {
    margin: 0;
    font-weight: 700;
    color: var(--color-navy);
  }

  &__email {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-navy-muted);
    overflow-wrap: anywhere;
  }

  &__tags {
    margin-top: 0.3rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }

  &__tag {
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    background: var(--color-navy-soft);
    color: var(--color-navy);
    font-size: 0.75rem;
    font-weight: 700;

    &--pending {
      background: var(--color-maroon-soft);
      color: var(--color-maroon);
    }

    &--blocked {
      background: var(--color-maroon);
      color: var(--color-cream-high);
    }
  }

  &__since {
    font-size: 0.75rem;
    color: var(--color-navy-muted);
  }

  &__block-info {
    margin: 0.4rem 0 0;
    font-size: 0.85rem;
    color: var(--color-ink);
    overflow-wrap: anywhere;
  }

  &__actions {
    flex-shrink: 0;
  }

  &__block-form {
    flex-basis: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-navy-soft);
  }

  &__hint {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-navy-muted);
  }

  &__form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  &__empty {
    margin: 0;
    padding: 1.5rem 0;
    text-align: center;
    color: var(--color-navy-muted);
  }

  &__pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: var(--color-navy-muted);
  }

  &__link {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 700;
    color: var(--color-maroon);
    cursor: pointer;
  }

  &__error {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-maroon);
  }
}

// No celular os filtros ficam um embaixo do outro.
@media (max-width: 30rem) {
  .users__filters {
    grid-template-columns: 1fr;
  }
}
</style>
