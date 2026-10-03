<script setup lang="ts">
import type { CustomerSort } from '~/composables/useAdmin';
import type { AuthAccountRole } from '~/composables/useAuth';
import type { TierLevel } from '~/composables/usePoints';

// Todas as contas do programa com visitas, nível e pontos (somente
// super-admin).
definePageMeta({ middleware: ['auth', 'super-admin'] });

const STORE_TIME_ZONE = 'America/Sao_Paulo';
// Espera o super-admin parar de digitar antes de buscar.
const SEARCH_DEBOUNCE_MS = 350;

const TIER_LABELS: Record<TierLevel, string> = {
  standard: 'Standard',
  gold: 'Gold',
  platinum: 'Platinum',
  black: 'Black',
};

const ROLE_LABELS: Record<Exclude<AuthAccountRole, 'customer'>, string> = {
  admin: 'Admin',
  super_admin: 'Super-admin',
};

const { getCustomers } = useAdmin();

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
  sort: 'recent' as CustomerSort,
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
  'admin-customers',
  () =>
    getCustomers({
      search: filter.search || undefined,
      sort: filter.sort,
      page: page.value,
    }),
  { watch: [filter, page] },
);

const isLoading = computed(() => !data.value && !error.value);

function goToPage(target: number) {
  page.value = target;
  window.scrollTo({ top: 0 });
}
</script>

<template>
  <div class="customers">
    <header class="customers__header">
      <img
        src="/images/logo-single.svg"
        alt="Dili Cafés Especiais"
        class="customers__logo"
        width="40"
        height="40"
      />
      <div class="customers__heading">
        <h1 class="customers__title">Clientes</h1>
        <p class="customers__subtitle">Visitas, nível e pontos de cada conta</p>
      </div>
      <NuxtLink to="/admin" class="customers__button">
        Voltar ao painel
      </NuxtLink>
    </header>

    <section class="customers__card" aria-labelledby="filters-title">
      <h2 id="filters-title" class="visually-hidden">Filtros</h2>
      <div class="customers__filters">
        <label class="customers__field">
          <span class="customers__label">Buscar</span>
          <input
            v-model="searchInput"
            type="search"
            class="customers__input"
            placeholder="Nome ou e-mail"
            autocomplete="off"
          />
        </label>
        <label class="customers__field">
          <span class="customers__label">Ordenar por</span>
          <select v-model="filter.sort" class="customers__input">
            <option value="recent">Cadastro mais recente</option>
            <option value="visits">Mais visitas</option>
            <option value="points">Mais pontos</option>
          </select>
        </label>
      </div>
    </section>

    <section
      class="customers__card"
      aria-labelledby="list-title"
      aria-live="polite"
    >
      <div class="customers__card-header">
        <h2 id="list-title" class="customers__card-title">Contas</h2>
        <SkeletonBlock v-if="isLoading" width="5rem" height="0.9rem" />
        <p v-else-if="data" class="customers__count">
          {{ integer.format(data.total) }}
          {{ data.total === 1 ? 'conta' : 'contas' }}
        </p>
      </div>

      <div v-if="isLoading" class="customers__loading" aria-busy="true">
        <SkeletonBlock v-for="row in 5" :key="row" height="5rem" />
      </div>

      <p v-else-if="error" class="customers__error" role="alert">
        Não foi possível carregar os clientes.
        <button type="button" class="customers__link" @click="refresh()">
          Tentar novamente
        </button>
      </p>

      <template v-else-if="data">
        <p v-if="!data.items.length" class="customers__empty">
          Nenhuma conta encontrada.
        </p>

        <ul
          v-else
          class="customers__list"
          :class="{ 'customers__list--loading': status === 'pending' }"
        >
          <li
            v-for="customer in data.items"
            :key="customer.id"
            class="customers__item"
          >
            <div class="customers__identity">
              <p class="customers__name">
                {{ customer.name }}
                <span
                  v-if="customer.role !== 'customer'"
                  class="customers__role"
                >
                  {{ ROLE_LABELS[customer.role] }}
                </span>
              </p>
              <p class="customers__email">{{ customer.email }}</p>
              <p class="customers__since">
                Cliente desde
                {{ dateFormat.format(new Date(customer.createdAt)) }}
              </p>
            </div>

            <p
              class="customers__tier"
              :class="`customers__tier--${customer.tier}`"
            >
              {{ TIER_LABELS[customer.tier] }}
            </p>

            <dl class="customers__stats">
              <div class="customers__stat">
                <dt>Visitas</dt>
                <dd>{{ integer.format(customer.visits) }}</dd>
              </div>
              <div class="customers__stat">
                <dt>Pontos ganhos</dt>
                <dd>{{ integer.format(customer.totalPoints) }}</dd>
              </div>
              <div class="customers__stat">
                <dt>Saldo</dt>
                <dd>{{ integer.format(customer.balance) }}</dd>
              </div>
            </dl>
          </li>
        </ul>

        <nav
          v-if="data.totalPages > 1"
          class="customers__pagination"
          aria-label="Paginação"
        >
          <button
            type="button"
            class="customers__button"
            :disabled="page <= 1 || status === 'pending'"
            @click="goToPage(page - 1)"
          >
            Anterior
          </button>
          <span>Página {{ data.page }} de {{ data.totalPages }}</span>
          <button
            type="button"
            class="customers__button"
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

.customers {
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
    cursor: pointer;
    transition: opacity 0.2s ease;

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

  // Desktop: identidade | nível | números, numa linha só.
  &__item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 6rem 19rem;
    align-items: center;
    gap: 1rem;
    padding: 0.9rem 1rem;
    border-radius: 0.9rem;
    background: var(--color-cream);
  }

  &__identity {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  &__name {
    margin: 0;
    font-weight: 700;
    color: var(--color-navy);
  }

  &__role {
    margin-left: 0.3rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    background: var(--color-navy-soft);
    font-size: 0.7rem;
    font-weight: 700;
    vertical-align: middle;
  }

  &__email {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-navy-muted);
    overflow-wrap: anywhere;
  }

  &__since {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-navy-muted);
  }

  // Mesmas cores dos níveis do perfil do cliente.
  &__tier {
    margin: 0;
    font-family: 'Montserrat Alternates', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    color: var(--color-navy);

    &--gold,
    &--platinum,
    &--black {
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
      width: fit-content;
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

  &__stats {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    text-align: right;

    dt {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-navy-muted);
    }

    dd {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--color-navy);
      font-variant-numeric: tabular-nums;
    }
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

// Celular: nível ao lado do nome e os números numa faixa embaixo.
@media (max-width: 40rem) {
  .customers__filters {
    grid-template-columns: 1fr;
  }

  .customers__item {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 0.75rem;
  }

  .customers__stats {
    grid-column: 1 / -1;
    padding-top: 0.6rem;
    border-top: 1px solid var(--color-navy-soft);
  }

  .customers__stat {
    text-align: left;
  }
}
</style>
